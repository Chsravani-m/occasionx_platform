"""
One-off migration: adds an application_fee column to bookings, so each
booking can store its own share of the OX application fee (see
crud/payment.py create_combined_order) instead of that amount only
living on the shared BookingCharge row. Lets receipts show Service
Provider Fee and Application Fee as separate line items per booking.

Run this once:

    python -m app.migrate_add_application_fee
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "application_fee NUMERIC(12, 2)"
    ),
]

print("Running migration: add application_fee to bookings...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
