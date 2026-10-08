"""
One-off migration: adds is_screen_sharing / sharing_participant_id to the
existing collab_sessions table, for the live "screen mirroring" feature
(host streams their actual screen to guests via WebRTC).

The new collab_webrtc_signals table doesn't need a migration - it's
brand new, so app.main's Base.metadata.create_all(bind=engine) creates
it automatically on next service restart. This script only handles the
column additions to a table that already exists.

Run once:

    python -m app.migrate_add_screen_share
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENTS = [
    (
        "ALTER TABLE collab_sessions ADD COLUMN IF NOT EXISTS "
        "is_screen_sharing BOOLEAN DEFAULT FALSE"
    ),
    (
        "ALTER TABLE collab_sessions ADD COLUMN IF NOT EXISTS "
        "sharing_participant_id UUID"
    ),
]

print("Running migration: add screen-share columns to collab_sessions...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")
