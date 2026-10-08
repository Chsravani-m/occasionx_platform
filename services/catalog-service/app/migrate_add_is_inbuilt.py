"""
One-off migration: adds is_inbuilt to the existing event_types table.
Marks the ~10 official "OX In-Built Package" event types (Wedding,
Engagement, Reception, Birthday, Baby Shower, Naming Ceremony,
Housewarming, Corporate Event, Festival, Religious Ceremony) so the
admin UI can badge/filter them separately from the long tail of other
event types.

There's no alembic migration chain wired up for this service -
create_tables.py (or the seeders) only create tables that don't exist
yet, they won't add columns to a table that's already there. Run this
once:

    python -m app.migrate_add_is_inbuilt
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE event_types ADD COLUMN IF NOT EXISTS "
        "is_inbuilt BOOLEAN NOT NULL DEFAULT FALSE"
    ),
]

print("Running migration: add is_inbuilt to event_types...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
