"""
One-off migration: adds a category_name column to bookings, denormalized
at booking-creation time the same way provider_name/service_name are.
Needed so booking-service can enforce category-dependent minimum-notice
and cancellation-cutoff rules (see create_booking in crud/booking.py)
without a cross-service call at read time.

Run this once:

    python -m app.migrate_add_category_name
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
        "category_name VARCHAR"
    ),
]

print("Running migration: add category_name to bookings...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
