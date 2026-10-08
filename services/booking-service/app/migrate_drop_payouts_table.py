"""
One-off cleanup: drops the payouts table. OccasionX takes no
commission and never holds or pays out provider funds - the payout
request workflow (and its "platform commission" math) has been
removed in favor of a plain read-only earnings summary built off the
booking table. This just drops the now-unused table so it doesn't
linger in the database.

Run this once (safe to skip if you don't care about the leftover
table - the app no longer reads or writes it either way):

    python -m app.migrate_drop_payouts_table
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENT = "DROP TABLE IF EXISTS payouts"

print("Running cleanup: dropping unused payouts table...")

with engine.begin() as conn:
    conn.execute(text(STATEMENT))

print("Cleanup complete.")
