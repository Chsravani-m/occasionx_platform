"""
One-off backfill for databases that were already seeded before the
OX In-Built Packages work:

1. Sets is_inbuilt = TRUE on the 10 official event types (by name -
   see official_event_types.OFFICIAL_EVENT_TYPE_NAMES).
2. Inserts the "Naming Ceremony" -> category EventTypeCategory rows,
   since EVENT_TYPE_CATEGORY_MAPPING was missing that key until now
   and re-running the full seeder is a separate, optional step.

Requires migrate_add_is_inbuilt.py to have been run first (adds the
is_inbuilt column). Safe to re-run - every step checks before writing.

    python -m app.migrate_backfill_official_event_types
"""

from app.db.database import SessionLocal

from app.db.models.event_type import EventType
from app.db.models.category import Category
from app.db.models.event_type_category import EventTypeCategory

from app.seeders.official_event_types import OFFICIAL_EVENT_TYPE_NAMES
from app.seeders.event_type_categories import EVENT_TYPE_CATEGORY_MAPPING

db = SessionLocal()

print("Backfilling is_inbuilt on official event types...")

flagged = 0

for name in OFFICIAL_EVENT_TYPE_NAMES:

    event = (
        db.query(EventType)
        .filter(EventType.name == name)
        .first()
    )

    if not event:
        print(f"  SKIP (not found): {name}")
        continue

    if not event.is_inbuilt:
        event.is_inbuilt = True
        flagged += 1
        print(f"  Flagged: {name}")
    else:
        print(f"  Already flagged: {name}")

db.commit()

print(f"Flagged {flagged} event type(s).")

print("Backfilling Naming Ceremony category defaults...")

naming_ceremony_categories = EVENT_TYPE_CATEGORY_MAPPING.get(
    "Naming Ceremony", []
)

event = (
    db.query(EventType)
    .filter(EventType.name == "Naming Ceremony")
    .first()
)

inserted = 0

if not event:
    print("  SKIP: Naming Ceremony event type not found")
else:
    for category_name in naming_ceremony_categories:

        category = (
            db.query(Category)
            .filter(Category.name == category_name)
            .first()
        )

        if not category:
            print(f"  SKIP (category not found): {category_name}")
            continue

        exists = (
            db.query(EventTypeCategory)
            .filter(
                EventTypeCategory.event_type_id == event.id,
                EventTypeCategory.category_id == category.id
            )
            .first()
        )

        if not exists:
            db.add(
                EventTypeCategory(
                    event_type_id=event.id,
                    category_id=category.id
                )
            )
            inserted += 1
            print(f"  Added: Naming Ceremony -> {category_name}")

db.commit()
db.close()

print(f"Inserted {inserted} Naming Ceremony category link(s).")
print("Backfill complete.")
