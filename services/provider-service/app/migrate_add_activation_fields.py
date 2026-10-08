"""
One-off migration: adds account_activated / activation_token /
activated_at columns to the existing providers table.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_activation_fields
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "account_activated BOOLEAN DEFAULT FALSE"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "activation_token VARCHAR(255)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "activated_at TIMESTAMP"
    ),
]

print("Running migration: add activation fields to providers...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
