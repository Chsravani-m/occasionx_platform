"""
One-off migration: adds is_paid_member column to the existing users
table.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_is_paid_member
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
        "is_paid_member BOOLEAN NOT NULL DEFAULT FALSE"
    ),
]

print("Running migration: add is_paid_member to users...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
