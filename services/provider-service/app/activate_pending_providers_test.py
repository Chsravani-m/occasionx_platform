"""
Dev/test-mode helper: manually activates provider accounts without
going through the real email-activation flow.

Normal flow is: register -> pay registration fee (real or
PAYMENT_TEST_MODE) -> generate_activation_token() fires
send_activation_email() -> provider clicks the link in their inbox ->
activate_provider_account() sets verification_status="VERIFIED",
account_activated=True. See crud/provider.py.

If a provider never received/clicked that email - SMTP misconfigured,
email went to spam, the provider row was created some other way, etc.
- they're stuck at verification_status="PENDING" forever, since
verification_status only ever changes via that activation click (or
seed_providers.py for demo rows). Customer search/booking only shows
VERIFIED providers (see api/search.py), so a PENDING provider is
invisible to customers.

This script activates PENDING providers directly, bypassing the email
step entirely. Only meant for testing - for real providers, get SMTP
delivery working (or a real WhatsApp/SMS resend) instead of running
this.

Usage, from inside services/provider-service (so its own .env/venv is
active):

    # List every provider still stuck at PENDING (no changes made)
    python -m app.activate_pending_providers_test

    # Activate every PENDING provider
    python -m app.activate_pending_providers_test --all

    # Activate only specific providers, by email
    python -m app.activate_pending_providers_test one@example.com two@example.com

Safe to re-run - only touches providers not already VERIFIED.
"""

import sys
from datetime import datetime

from app.db.database import SessionLocal
from app.db.models.provider import Provider


def main():
    args = sys.argv[1:]
    activate_all = "--all" in args
    emails = [a for a in args if a != "--all"]

    db = SessionLocal()

    try:
        query = db.query(Provider).filter(
            Provider.verification_status == "PENDING"
        )

        if emails:
            query = query.filter(Provider.email.in_(emails))

        pending = query.all()

        if not pending:
            print("No matching PENDING providers found.")
            return

        if not activate_all and not emails:
            print(f"{len(pending)} provider(s) currently PENDING:\n")
            for p in pending:
                print(f"  - {p.business_name} ({p.email}) [id={p.id}]")
            print(
                "\nRe-run with --all to activate every one of these, or "
                "list specific emails to activate just those, e.g.:\n"
                "  python -m app.activate_pending_providers_test "
                "provider@example.com"
            )
            return

        now = datetime.utcnow()

        for provider in pending:
            provider.verification_status = "VERIFIED"
            provider.verified_at = provider.verified_at or now
            provider.account_activated = True
            provider.activated_at = provider.activated_at or now
            provider.registration_fee_paid = True
            provider.activation_token = None

        db.commit()

        print(f"Activated {len(pending)} provider(s):")
        for p in pending:
            print(f"  - {p.business_name} ({p.email})")

    finally:
        db.close()


if __name__ == "__main__":
    main()
