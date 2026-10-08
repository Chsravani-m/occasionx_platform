"""
One-off migration: adds payment_method/payment_type/amount_paid
columns to bookings, so an offline booking can record how the
provider was paid (Cash/UPI/Card/etc.) and whether it was a full
payment or just an advance.

Run this once:

    python -m app.migrate_add_offline_payment_fields
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "payment_method VARCHAR(30)"
    ),
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "payment_type VARCHAR(20)"
    ),
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "amount_paid NUMERIC(12, 2)"
    ),
]

print(
    "Running migration: add payment_method/payment_type/amount_paid "
    "to bookings..."
)

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
