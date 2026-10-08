"""
One-off migration: adds occupancy_per_room column to the existing
service_pricing table.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_occupancy_field
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS "
        "occupancy_per_room INTEGER"
    ),
]

print("Running migration: add occupancy_per_room to service_pricing...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
