"""
One-off migration: adds tier to the existing packages table, and
backfills a sensible starting tier for packages created before this
column existed (admins can re-assign any of them afterwards from the
Package Management screen).

Backfill logic per event type, ordered by min_budget ascending:
- 1 package  -> STANDARD
- 2 packages -> BASIC, PREMIUM
- 3+ packages -> split into thirds: BASIC, STANDARD, PREMIUM

There's no alembic migration chain wired up for this service -
create_tables.py (or the seeders) only create tables that don't exist
yet, they won't add columns to a table that's already there. Run this
once:

    python -m app.migrate_add_package_tier
"""

from collections import defaultdict

from sqlalchemy import text

from app.db.database import engine, SessionLocal
from app.db.models.package import Package

STATEMENTS = [
    (
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS "
        "tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD'"
    ),
]

print("Running migration: add tier to packages...")

with engine.begin() as conn:
    for statement in STATEMENTS:
        print(f"  {statement}")
        conn.execute(text(statement))

print("Migration complete.")

print("Backfilling tiers for existing packages...")

db = SessionLocal()

packages = db.query(Package).all()

by_event_type = defaultdict(list)

for pkg in packages:
    by_event_type[pkg.event_type_id].append(pkg)

updated = 0

for event_type_id, group in by_event_type.items():
    group.sort(key=lambda p: float(p.min_budget or 0))

    n = len(group)

    for index, pkg in enumerate(group):
        if n == 1:
            tier = "STANDARD"
        elif n == 2:
            tier = "BASIC" if index == 0 else "PREMIUM"
        else:
            third = n / 3
            if index < third:
                tier = "BASIC"
            elif index < third * 2:
                tier = "STANDARD"
            else:
                tier = "PREMIUM"

        if pkg.tier != tier:
            pkg.tier = tier
            updated += 1
            print(f"  {pkg.name}: -> {tier}")

db.commit()
db.close()

print(f"Backfilled {updated} package(s).")
print("Done.")
