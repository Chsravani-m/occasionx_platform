"""
One-off migration: adds bank details + Razorpay linked-account columns
to the existing providers table.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_bank_details
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "bank_account_holder_name VARCHAR(255)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "bank_account_number VARCHAR(50)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "bank_ifsc_code VARCHAR(20)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "bank_name VARCHAR(255)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_linked_account_id VARCHAR(100)"
    ),
]

print("Running migration: add bank details to providers...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
