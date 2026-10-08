"""
One-off migration: adds an attributes column to the existing
provider_services table - lets a provider fill in category-specific
spec fields (Venue Type/Indoor Capacity/Amenities for Venue, Cuisine/
Per Plate pricing for Catering, etc.) from the dashboard. Stored as a
JSON-encoded Text column (this codebase's existing convention for
list/dict fields - see migrate_add_registration_wizard_fields.py).

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_service_attributes
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS "
        "attributes TEXT"
    ),
]

print("Running migration: add attributes to provider_services...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
