"""
One-off migration: adds created_at to the existing providers table -
powers the customer app's Browse screen "Recently Added" default view
(see get_recently_added_providers in crud/provider_category.py).

Existing rows get backfilled to the current time via the column
default, since there's no real signup timestamp to recover for them -
they'll just sort behind any provider added after this migration
runs, which is fine.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_provider_created_at
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "created_at TIMESTAMP NOT NULL DEFAULT now()"
    ),
]

print("Running migration: add created_at to providers...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
