"""
One-off migration: adds display_picture_url to the existing providers
table - a dedicated profile/cover photo the provider sets themselves,
separate from portfolio media, shown as the background behind their
business name on provider cards and the details page in the customer
app.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_display_picture
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENT = (
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
    "display_picture_url VARCHAR(500)"
)

print("Running migration: add display_picture_url to providers...")

with engine.begin() as conn:
    print(f"  {STATEMENT}")
    conn.execute(text(STATEMENT))

print("Migration complete.")
