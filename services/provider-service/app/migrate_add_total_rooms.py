"""
One-off migration: adds total_rooms column to the existing
service_pricing table - lets a provider declare how many rooms/suites
they have for an Accommodation PER_DAY pricing tier, so booking-service
can allow multiple different customers to book the same date instead
of the first booking blocking it for everyone else.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_total_rooms
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS "
        "total_rooms INTEGER"
    ),
]

print("Running migration: add total_rooms to service_pricing...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
