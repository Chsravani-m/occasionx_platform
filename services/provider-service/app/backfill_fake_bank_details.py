"""
One-off script: fills in FAKE bank details for every existing provider
that doesn't have any yet, so the "Bank Details" screen in the
provider dashboard has something real to show while testing, without
every seeded/demo provider having to fill the form in by hand.

These are placeholder values only - real providers should still
update them from their dashboard with their actual account details.
razorpay_linked_account_id is deliberately left NULL, since that can
only come from Razorpay's own linked-account KYC flow, not from
anything this script can fake.

Run this once, from inside services/provider-service (so its own
.env / venv is active):

    python -m app.backfill_fake_bank_details

Safe to re-run - only touches providers with no bank details set yet.
"""

import random

from app.db.database import SessionLocal
from app.db.models.provider import Provider

FAKE_BANKS = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Kotak Mahindra Bank",
    "Bank of Baroda",
    "IndusInd Bank",
]

# Real IFSC prefixes for the banks above, in the same order - fake
# branch code appended after, so results at least look plausible.
FAKE_IFSC_PREFIXES = [
    "SBIN0",
    "HDFC0",
    "ICIC0",
    "UTIB0",
    "PUNB0",
    "KKBK0",
    "BARB0",
    "INDB0",
]


def fake_account_number() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(12))


def fake_ifsc(bank_index: int) -> str:
    branch_code = "".join(
        str(random.randint(0, 9)) for _ in range(6)
    )
    return f"{FAKE_IFSC_PREFIXES[bank_index]}{branch_code}"


def main():
    db = SessionLocal()

    try:
        providers = (
            db.query(Provider)
            .filter(Provider.bank_account_number.is_(None))
            .all()
        )

        if not providers:
            print("No providers missing bank details - nothing to do.")
            return

        for provider in providers:
            bank_index = random.randrange(len(FAKE_BANKS))

            provider.bank_account_holder_name = (
                provider.owner_name or provider.business_name
            )
            provider.bank_account_number = fake_account_number()
            provider.bank_ifsc_code = fake_ifsc(bank_index)
            provider.bank_name = FAKE_BANKS[bank_index]

        db.commit()

        print(
            f"Added fake bank details to {len(providers)} provider(s)."
        )

    finally:
        db.close()


if __name__ == "__main__":
    main()
