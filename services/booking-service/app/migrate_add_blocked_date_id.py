"""
One-off migration: adds blocked_date_id column to the existing
bookings table - used to release a held date if the booking is
rejected or its payment window expires without payment.

There's no alembic migration chain set up for this service yet -
create_tables.py only creates tables that don't exist, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_blocked_date_id
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "blocked_date_id UUID"
    ),
]

print("Running migration: add blocked_date_id to bookings...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
