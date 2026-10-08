# OccasionX

Event-services marketplace: customers discover and book vendors (catering,
venues, decoration, photography and more) and providers manage services,
bookings and payouts.

## Repository layout

| Path | What it is |
|---|---|
| `services/api-gateway` | Single public API entry point; proxies to the services below |
| `services/auth-service` | Accounts, login, OTP, membership fee |
| `services/user-service` | Customer profiles |
| `services/provider-service` | Provider onboarding, services/pricing, portfolio, payouts |
| `services/catalog-service` | Event types, categories, packages, locations |
| `services/booking-service` | Bookings, payments, reviews, wishlist, notifications |
| `services/search-service` | Search, budget estimates, package recommendations |
| `services/ai-service` | AI package proposals and chat |
| `services/collab-service` | "Plan Together" group sessions |
| `frontend/web-app` | Next.js web app (customer, provider dashboard, admin) |
| `frontend/mobile-customer-app`, `frontend/mobile-provider-app` | Expo apps |
| `deploy/`, `docker-compose.yml` | Production setup |

The remaining folders under `services/` are unused starter stubs.

## Production

See **[DEPLOYMENT.md](DEPLOYMENT.md)**: Docker Compose, Postgres with
Alembic migrations, automatic HTTPS and backups.

## Local development

See `OccasionX_RDP_Setup_Runbook.md`. Each service runs with
`uvicorn app.main:app --reload --port 80xx` using its own `.env`. Every
setting has a localhost default, so no extra configuration is needed.
