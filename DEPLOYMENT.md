# Deploying OccasionX to production

The whole platform (8 FastAPI services, the API gateway, the Next.js web
app, Postgres, Redis and an HTTPS reverse proxy) runs from one
`docker-compose.yml` on a single Linux server.

```
                 ┌──────────── Caddy (80/443, automatic HTTPS) ────────────┐
   occasionx.com │→ web (Next.js :3000)                                    │
api.occasionx.com│→ api-gateway (:8000) → auth · user · provider · catalog │
                 │                        booking · search · ai · collab   │
                 └──────────── postgres (6 databases) · redis ─────────────┘
```

Only Caddy is exposed to the internet. Everything else sits on a private
Docker network.

## 1. Server

- Ubuntu 22.04/24.04 with at least 2 vCPU, 4 GB RAM and 40 GB disk (for
  example AWS Lightsail/EC2, DigitalOcean or Hetzner).
- Docker Engine with the Compose plugin:
  `curl -fsSL https://get.docker.com | sh`
- Firewall: allow 22, 80 and 443 only.
- DNS: point A records for both domains (for example `occasionx.com` and
  `api.occasionx.com`) at the server's IP **before** the first start, so
  Caddy can issue certificates.

## 2. First deploy

```bash
git clone <your repo url> /opt/occasionx
cd /opt/occasionx
cp .env.example .env
nano .env            # fill in every value; see the comments in the file
docker compose up -d --build
```

On first start:

- Postgres creates the `occasionx` role and the six databases
  (`deploy/postgres/init-databases.sh`).
- Each service runs `alembic upgrade head` before starting, which creates
  its tables.
- catalog-service seeds states and districts, and auth-service creates the
  admin account from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

Then load the catalog (event types, categories and subcategories). Run this
once; it is safe to re-run:

```bash
docker compose exec catalog-service python -m app.seeders.seed_all
```

Check it is up:

```bash
docker compose ps                                  # all "healthy"
curl https://api.occasionx.com/catalog/categories  # JSON list
```

Then open `https://occasionx.com` and sign in with the admin account.

## 3. Updating

```bash
cd /opt/occasionx
git pull
docker compose up -d --build
```

Migrations run automatically when each service restarts.

## 4. Database changes (for developers)

Schema is now managed by Alembic in each service that has a database
(auth, user, provider, catalog, booking, collab). The old
`migrate_*.py` / `create_tables.py` scripts are only for older local
setups.

After changing a model:

```bash
cd services/provider-service
alembic revision --autogenerate -m "add instagram_url to providers"
# review the generated file in alembic/versions/, then
alembic upgrade head
```

Commit the new file in `alembic/versions/`; production applies it on the
next deploy.

**Existing local databases** were created before Alembic. Mark them as
being at the baseline once, then check for drift:

```bash
cd services/<service>
alembic stamp head
alembic check      # "No new upgrade operations detected" = in sync
```

Local development is otherwise unchanged. Every setting falls back to
the old `localhost` defaults. `create_all` still runs locally (turned off
in production with `AUTO_CREATE_TABLES=false`), and SQL logging is off
unless `SQL_ECHO=true`.

## 5. Backups

```bash
./deploy/scripts/backup.sh       # dumps all 6 DBs + provider uploads into backups/<timestamp>/
```

Schedule it nightly with cron (the example is in the script), and copy
`backups/` off the server regularly.

To restore one database:
`docker compose exec -T postgres pg_restore -U postgres --clean -d occasionx_booking_db < backups/<ts>/occasionx_booking_db.dump`

## 6. Moving existing data (optional)

To launch with your current local data instead of empty databases, follow
the steps at the top of `deploy/scripts/import-local-dumps.sh`. Provider
images and documents live in `services/provider-service/uploads/`
locally. Copy that folder to the server, then into the `provider_uploads`
volume:

```bash
docker compose cp services/provider-service/uploads/. provider-service:/app/uploads/
docker compose exec -u root provider-service chown -R app:app /app/uploads
```

## 7. Mobile apps

The Expo apps are built separately (EAS Build), not with Docker. Point them
at the production gateway when building:

```bash
EXPO_PUBLIC_API_GATEWAY_URL=https://api.occasionx.com eas build
```

## 8. Settings reference

All production settings live in the root `.env` (template:
`.env.example`). The ones that change behaviour:

| Setting | Production value | Notes |
|---|---|---|
| `PAYMENT_TEST_MODE` | `false` | One switch for every service and the web app (previously set separately in each `.env`) |
| `WHATSAPP_TEST_MODE` | `false` once Meta keys exist | While `true`, OTP codes are returned in API responses, so anyone can log in to any account via OTP |
| `SECRET_KEY` | long random hex | Shared by all services; changing it logs everyone out |
| `WEB_CONCURRENCY` | `1` (default) | Workers per service; startup seeding isn't safe with several workers starting at once |

`NEXT_PUBLIC_*` values are baked into the web bundle at build time, so
rerun `docker compose up -d --build web` after changing the domains,
Razorpay key or payment mode.

## 9. Before opening to the public

Production setup doesn't fix these application-level issues from the
launch review. They are still open:

- [ ] Most API endpoints don't check the caller's login/role (for example
      provider bank details, catalog admin endpoints)
- [ ] `WHATSAPP_TEST_MODE=true` exposes OTP codes (see above)
- [ ] `verify-registration-payment` doesn't bind the payment to the
      registration-fee order
- [ ] `/uploads/provider-documents/` (KYC files) is publicly readable
- [ ] Test prices still in code: membership fee and booking charge are ₹1
      (`auth-service/app/crud/membership.py`,
      `booking-service/app/crud/booking_charge.py`)
- [ ] Razorpay `payment.captured` webhook as a backstop for closed tabs
- [ ] Payout split (Razorpay Route) verified with a real linked account
