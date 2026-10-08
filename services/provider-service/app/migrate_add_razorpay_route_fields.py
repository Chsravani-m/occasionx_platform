"""
One-off migration: adds the Razorpay Route linked-account KYC/status
columns to the existing providers table (business type/category, PAN,
address, and onboarding status/requirements/error) - everything
crud/razorpay_account.py needs to actually create and activate a
Route linked account for a provider, instead of leaving
razorpay_linked_account_id permanently NULL.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_razorpay_route_fields
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "pan_number VARCHAR(20)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "business_type VARCHAR(50)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "business_category VARCHAR(100)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "business_subcategory VARCHAR(100)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_address_line1 VARCHAR(255)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_address_line2 VARCHAR(255)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_city VARCHAR(100)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_state VARCHAR(100)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_postal_code VARCHAR(20)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_product_id VARCHAR(100)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_account_status VARCHAR(50)"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_account_requirements TEXT"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "razorpay_account_error TEXT"
    ),
]

print("Running migration: add Razorpay Route fields to providers...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
