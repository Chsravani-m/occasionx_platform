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
| `WHATSAPP_TEST_MODE` | `false` | `true` only logs WhatsApp messages instead of sending them. Codes are never returned in API responses in production |
| `MEMBERSHIP_FEE_PAISE` / `BOOKING_CHARGE_AMOUNT_PAISE` / `PROVIDER_REGISTRATION_FEE_PAISE` | `49900` / `9900` / `99900` | Fees in paise. If you change the booking charge, also update `BOOKING_CHARGE_AMOUNT` in `frontend/web-app/src/utils/pricing.ts` and the two mobile screens that show it |
| `INTERNAL_API_KEY` | unset | Optional. Key the services use to call each other; derived from `SECRET_KEY` when unset |
| `SECRET_KEY` | long random hex | Shared by all services; changing it logs everyone out |
| `WEB_CONCURRENCY` | `1` (default) | Workers per service; startup seeding isn't safe with several workers starting at once |

`NEXT_PUBLIC_*` values are baked into the web bundle at build time, so
rerun `docker compose up -d --build web` after changing the domains,
Razorpay key or payment mode.

## 9. Access control

Every backend service checks who is calling (shared code:
`services/shared/service_auth.py`, copied into each service's
`app/core/service_auth.py`):

- **Logged-in users** send the access token from `/auth/login`. Users can
  only read or change their own records (bookings, notifications,
  membership, wishlist); providers only their own provider account,
  services, pricing, blocked dates, documents and bank details. Admin
  pages need an `ADMIN` or `SUPER_ADMIN` account.
- **Providers still in the registration wizard** (not yet activated, so
  they can't log in) get a 24-hour `onboarding_token` from
  `/auth/register-provider`. It only works on that provider's own
  onboarding endpoints and the registration-fee payment.
- **Services calling each other** send an `X-Internal-Key` header derived
  from `SECRET_KEY` (or `INTERNAL_API_KEY` if you set one). It is added
  automatically to calls between services and stripped from anything
  arriving through the API gateway.
- **Anonymous visitors** can still browse: catalog, locations, provider
  listings/details/portfolio/services/pricing, reviews, search and the AI
  planner. Private provider fields (PAN, Aadhaar, bank details, cheque,
  registration number) are blanked in public responses.
- **KYC documents** (`/uploads/provider-documents/...`) are only served to
  the provider who uploaded them and to admins. Other uploads (photos,
  portfolio, videos) stay public.

After editing `services/shared/service_auth.py`, run
`python services/shared/sync_service_auth.py`. Tests:

```bash
pytest services/shared                            # unit tests, no services needed
python services/shared/security_smoke_test.py     # against a LOCAL dev stack only
```

## 10. Before opening to the public

Done:

- [x] API endpoints check the caller's login/role (see section 9)
- [x] OTP codes are never returned in API responses when
      `APP_ENV=production`, even if `WHATSAPP_TEST_MODE=true`
- [x] `verify-registration-payment` only accepts a payment for the
      provider's own registration-fee order, and checks with Razorpay
      that it is paid in full
- [x] KYC files under `/uploads/provider-documents/` need a login
- [x] Real prices: membership Rs.499, booking charge Rs.99 (env
      `MEMBERSHIP_FEE_PAISE`, `BOOKING_CHARGE_AMOUNT_PAISE`,
      `PROVIDER_REGISTRATION_FEE_PAISE`)

Still open:

- [ ] **WhatsApp (Meta) credentials.** Provider sign-up and OTP login send
      codes over WhatsApp. Until `WHATSAPP_ACCESS_TOKEN` /
      `WHATSAPP_PHONE_NUMBER_ID` are set with `WHATSAPP_TEST_MODE=false`,
      providers cannot register in production.
- [ ] Razorpay `payment.captured` webhook as a backstop for closed tabs
- [ ] Payout split (Razorpay Route) verified with a real linked account
- [ ] Rate limiting on login/OTP and on the AI endpoints (`/ai/*`), which
      are public and call OpenAI
