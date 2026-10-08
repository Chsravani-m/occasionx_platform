"""
One-off migration: adds every column the new 7-tab Service Provider
Registration wizard needs on top of the existing providers table
(Business Information / Contact Details / Business Location / Services
/ Pricing / Availability / KYC tabs). See db/models/provider.py for
the field-by-field comments on what each one is for.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_registration_wizard_fields
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    # Tab 1: Business Information
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS legal_entity_name VARCHAR(255)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(100)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS year_established INTEGER",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS promotional_video_url VARCHAR(500)",

    # Tab 2: Contact Details
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS website_url VARCHAR(500)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(500)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(500)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(500)",

    # Tab 3: Business Location
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India'",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS area VARCHAR(255)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS google_map_url VARCHAR(500)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS service_radius_km INTEGER",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS branches TEXT",

    # Tab 4: Services
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS languages_spoken TEXT",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS years_of_experience INTEGER",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS team_size INTEGER",

    # Tab 5: Pricing
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS starting_price NUMERIC(10, 2)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS price_range_min NUMERIC(10, 2)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS price_range_max NUMERIC(10, 2)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS custom_quotation_available BOOLEAN DEFAULT FALSE",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS advance_percentage INTEGER",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS payment_modes TEXT",

    # Tab 6: Availability
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS business_hours TEXT",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS weekly_off TEXT",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS holidays TEXT",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS instant_booking BOOLEAN DEFAULT FALSE",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS calendar_integration_enabled BOOLEAN DEFAULT FALSE",

    # Tab 7: KYC
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20)",
    "ALTER TABLE providers ADD COLUMN IF NOT EXISTS cancelled_cheque_url VARCHAR(500)",

    # state_id / district_id / location_id / business_name / owner_name
    # were previously required at creation time (ProviderCreate) since
    # the old flow collected them before the account existed. The new
    # wizard creates the account after Tab 2 (Contact Details), before
    # Tab 3 (Business Location), so these columns need to accept NULL
    # between account creation and the provider finishing Tab 3.
    "ALTER TABLE providers ALTER COLUMN business_name DROP NOT NULL",
    "ALTER TABLE providers ALTER COLUMN owner_name DROP NOT NULL",
]

print("Running migration: add 7-tab registration wizard fields to providers...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
