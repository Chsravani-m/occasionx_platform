"""
One-off migration: adds provider-configurable booking-notice +
cancellation-policy columns to the existing providers table.

Replaces the old platform-wide category-tier day-based notice rule
(app/core/booking_rules.py in booking-service) with a per-provider
hours-based setting the provider controls from their own dashboard,
plus a free-text cancellation policy shown to customers like a short
terms-and-conditions clause.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_booking_policy
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "booking_notice_hours INTEGER NOT NULL DEFAULT 6"
    ),
    (
        "ALTER TABLE providers ADD COLUMN IF NOT EXISTS "
        "cancellation_policy TEXT"
    ),
]

print("Running migration: add booking policy fields to providers...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
