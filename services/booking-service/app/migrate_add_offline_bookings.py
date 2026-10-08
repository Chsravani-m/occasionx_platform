"""
One-off migration: adds support for provider-logged "offline"
bookings (jobs done outside OccasionX) - relaxes customer_id/
service_id/pricing_id to nullable since offline entries have no real
rows to point at, and adds source/payment_date/offline_blocked_date_ids
columns.

There's no alembic migration chain set up for this service yet -
create_tables.py only creates tables that don't exist, it won't
add columns to a table that's already there or relax constraints.
Run this once:

    python -m app.migrate_add_offline_bookings
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    "ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL",
    "ALTER TABLE bookings ALTER COLUMN service_id DROP NOT NULL",
    "ALTER TABLE bookings ALTER COLUMN pricing_id DROP NOT NULL",
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "source VARCHAR(20) NOT NULL DEFAULT 'ONLINE'"
    ),
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "payment_date DATE"
    ),
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "offline_blocked_date_ids TEXT"
    ),
]

print("Running migration: add offline-booking support to bookings...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
