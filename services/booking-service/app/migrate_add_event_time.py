"""
One-off migration: adds an event_time column to the existing bookings
table.

Needed so the provider-configurable booking-notice policy
(booking_notice_hours on provider-service's Provider) can be checked
against the real event date+time (e.g. a 12:00pm event can be booked
from 6:00am the same day if the provider requires 6 hours' notice)
instead of just midnight of the event day. Nullable - older rows and
offline bookings (logged after the fact) have no real event_time.

There's no alembic migration chain wired up for this service -
create_tables.py only creates tables that don't exist yet, it won't
add columns to a table that's already there. Run this once:

    python -m app.migrate_add_event_time
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_time TIME",
]

print("Running migration: add event_time to bookings...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
