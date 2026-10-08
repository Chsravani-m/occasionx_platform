"""
One-off migration: adds event_end_date + quantity columns to the
existing bookings table.

There's no alembic migration chain set up for this service yet -
create_tables.py only creates tables that don't exist, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_accommodation_fields
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_end_date DATE",
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "quantity INTEGER DEFAULT 1"
    ),
]

print("Running migration: add accommodation fields to bookings...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
