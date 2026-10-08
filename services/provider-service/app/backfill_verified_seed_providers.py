"""
One-off script: fixes stale seeded/demo providers left at
verification_status="PENDING" from before seed_providers.py was
updated to create them already VERIFIED/account_activated/
registration_fee_paid.

Only providers can only be booked once verification_status ==
"VERIFIED" (see provider-service/app/api/search.py's filters), and
verification_status is now only ever set to VERIFIED in two places:
  1. seed_providers.py, for newly-created seed rows (already correct
     going forward).
  2. crud/provider.py's activate_provider_account(), when a real
     provider clicks the activation link in their registration email.

Seed rows created by an older run of seed_providers.py (before it set
verification_status="VERIFIED" itself) never go through either path,
since they skip signup/subscription/activation entirely - so they're
stuck at whatever default they were created with and can never be
booked. This script finds any provider whose business_name contains
the "(Seed)" marker and isn't already fully activated, and brings it
up to the same state seed_providers.py creates new rows in today.

Run this once, from inside services/provider-service (so its own
.env / venv is active):

    python -m app.backfill_verified_seed_providers

Safe to re-run - only touches seed providers not already VERIFIED /
activated / fee-paid.
"""

from datetime import datetime

from app.db.database import SessionLocal
from app.db.models.provider import Provider

SEED_MARKER = "(Seed)"


def main():
    db = SessionLocal()

    try:
        providers = (
            db.query(Provider)
            .filter(Provider.business_name.like(f"%{SEED_MARKER}%"))
            .filter(
                (Provider.verification_status != "VERIFIED")
                | (Provider.account_activated.is_(False))
                | (Provider.registration_fee_paid.is_(False))
            )
            .all()
        )

        if not providers:
            print("No stale seed providers found - nothing to do.")
            return

        now = datetime.utcnow()

        for provider in providers:
            provider.verification_status = "VERIFIED"
            provider.verified_at = provider.verified_at or now
            provider.account_activated = True
            provider.activated_at = provider.activated_at or now
            provider.registration_fee_paid = True

        db.commit()

        print(
            f"Fixed {len(providers)} stale seed provider(s) - now "
            "VERIFIED, activated, and fee-paid."
        )

        for provider in providers:
            print(f"  - {provider.business_name} ({provider.email})")

    finally:
        db.close()


if __name__ == "__main__":
    main()
