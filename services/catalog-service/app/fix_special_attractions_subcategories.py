"""
One-off fix for a copy-paste bug in seeders/subcategories.py: the
"Special Attractions" category was seeded with Destination Weddings'
subcategories (Beach Wedding, Palace Wedding, Resort Wedding, Hill
Station Wedding) instead of its own. That mismatch is visible on the
search page - the subcategory dropdown showed wedding-venue options
while the "Services" spec filter (from serviceAttributesSchema.ts's
Special Add-ons bucket) correctly showed Fireworks/Photo Booth/360
Booth/Corporate Gifts/Exhibition Stalls/Kids Activities.

seed_all.py only ever adds subcategories, never removes/renames them,
so fixing SUBCATEGORIES["Special Attractions"] alone would just add
the correct 6 alongside the wrong 4, not replace them. This deletes
the 4 wrong rows and inserts the 6 correct ones.

Caveat: if any provider already picked one of the 4 wrong subcategory
names under Special Attractions, their Service/ProviderCategory row's
subcategory_id (in provider-service, a separate database - no FK
enforced across services) will start pointing at a deleted row. Safe
to run regardless; check provider-service manually afterward if that
matters for your data.

    python -m app.fix_special_attractions_subcategories
"""

from app.db.database import SessionLocal

from app.db.models.category import Category
from app.db.models.subcategory import SubCategory

WRONG_NAMES = [
    "Beach Wedding",
    "Palace Wedding",
    "Resort Wedding",
    "Hill Station Wedding",
]

CORRECT_NAMES = [
    "Fireworks",
    "Photo Booth",
    "360 Booth",
    "Corporate Gifts",
    "Exhibition Stalls",
    "Kids Activities",
]

db = SessionLocal()

category = (
    db.query(Category)
    .filter(Category.name == "Special Attractions")
    .first()
)

if not category:
    print("SKIP: 'Special Attractions' category not found.")
else:
    print(f"Fixing subcategories for category id {category.id}...")

    removed = 0

    for name in WRONG_NAMES:
        row = (
            db.query(SubCategory)
            .filter(
                SubCategory.category_id == category.id,
                SubCategory.name == name,
            )
            .first()
        )

        if row:
            db.delete(row)
            removed += 1
            print(f"  Removed: {name}")

    db.commit()
    print(f"Removed {removed} wrong subcategory row(s).")

    inserted = 0

    for name in CORRECT_NAMES:
        exists = (
            db.query(SubCategory)
            .filter(
                SubCategory.category_id == category.id,
                SubCategory.name == name,
            )
            .first()
        )

        if not exists:
            db.add(
                SubCategory(
                    category_id=category.id,
                    name=name,
                    description=name,
                )
            )
            inserted += 1
            print(f"  Added: {name}")

    db.commit()
    print(f"Inserted {inserted} correct subcategory row(s).")

db.close()

print("Done.")
