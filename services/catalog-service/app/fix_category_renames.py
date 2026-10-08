"""
One-off migration for the 10 category renames in seeders/categories.py
and seeders/subcategories.py (Venue -> Venues & Locations, Catering ->
Catering & Food, Decoration -> Decor & Ambience, Photography ->
Photography & Videography, Makeup & Grooming -> Outfits & Styling,
Event Planning -> Event Essentials, Invitations -> Invitations &
Gifting, Transportation -> Travel & Logistics, Religious Services ->
Spiritual & Ritual Services, Special Attractions -> Special Add-Ons).

seed_all.py only ever inserts categories/subcategories that don't
already exist (matched by name), so editing the seeder source alone
does NOT rename already-seeded rows - it would just insert 10 new
Category rows alongside the 10 old ones, orphaning every existing
Service/ProviderCategory row in provider-service that references the
old category_id (that FK isn't enforced across services, but the data
would still silently stop showing up anywhere the app filters/joins on
these categories).

This script instead:
1. UPDATEs each renamed Category row's name in place - same id, so
   every cross-service reference (provider-service's Service.category_id
   /ProviderCategory.category_id, this DB's own EventTypeCategory rows)
   keeps working with zero data migration needed on those tables.
2. Replaces each renamed category's SubCategory rows to match the new
   bullet list exactly - deletes whichever of the old subcategory names
   are no longer in the new list, then inserts whichever new names
   aren't already present (some new lists intentionally keep a few
   names identical to before, e.g. "Astrologers" under Spiritual &
   Ritual Services, so this only touches what actually changed).

Safe to re-run - every step checks before writing, and by the second
run the category names already match so it's a no-op.

    python -m app.fix_category_renames
"""

from app.db.database import SessionLocal

from app.db.models.category import Category
from app.db.models.subcategory import SubCategory


# (old_name, new_name, new_subcategory_names)
CATEGORY_RENAMES = [
    (
        "Photography",
        "Photography & Videography",
        [
            "Wedding Photography",
            "Candid Photography",
            "Traditional Photography",
            "Pre Wedding Photography",
            "Post Wedding Photography",
            "Drone Photography",
            "Maternity Photography",
            "Baby Photography",
            "Corporate Photography",
            "Product Photography",
            "Photographers",
            "Videographers",
            "Drone Services",
            "Live Streaming",
            "Instant Print Booths",
        ],
    ),
    (
        "Decoration",
        "Decor & Ambience",
        [
            "Event Planners / Designers",
            "Floral Decoration",
            "Stage & Lighting Setup",
            "Thematic Installations (Mandaps, Backdrops)",
            "Balloon & Party Decor",
        ],
    ),
    (
        "Venue",
        "Venues & Locations",
        [
            "Banquet Halls",
            "Convention Centers",
            "Hotels & Resorts",
            "Outdoor Gardens / Lawns",
            "Destination Venues",
            "Private Villas / Farmhouses",
            "Temples / Religious Venues",
            "Tourist Spots / Attractions",
        ],
    ),
    (
        "Catering",
        "Catering & Food",
        [
            "Full-Service Caterers",
            "Specialty Cuisine (Indian, Continental, etc.)",
            "Food Trucks / Live Counters",
            "Bakeries / Custom Cakes",
            "Beverage Services / Bartenders",
        ],
    ),
    (
        "Makeup & Grooming",
        "Outfits & Styling",
        [
            "Bridal Wear / Groom Wear",
            "Designers & Tailors",
            "Makeup Artists",
            "Hair Stylists",
            "Mehendi Artists",
        ],
    ),
    (
        "Event Planning",
        "Event Essentials",
        [
            "Event Coordinators",
            "Security Services",
            "Tent & Furniture Rentals",
            "Audio-Visual Equipment Rentals",
            "Licensing & Permits",
            "Marriage Bureaus",
        ],
    ),
    (
        "Invitations",
        "Invitations & Gifting",
        [
            "Printed Invitations",
            "E-Invites",
            "Return Gifts / Souvenirs",
            "Custom Merchandise",
            "Gift Wrapping Services",
        ],
    ),
    (
        "Transportation",
        "Travel & Logistics",
        [
            "Luxury Cars & Transport",
            "Buses / Shuttles",
            "Guest Accommodation",
            "Travel Agents (for destinations)",
            "Airport Pick-ups & Drops",
            "Honeymoon Packages / Tour Packages",
        ],
    ),
    (
        "Religious Services",
        "Spiritual & Ritual Services",
        [
            "Purohits / Priests",
            "Astrologers",
            "Ritual Experts / Vedic Services",
            "Temple Arrangements / Religious Guides",
        ],
    ),
    (
        "Special Attractions",
        "Special Add-Ons",
        [
            "Fireworks / Pyro Shows",
            "Photo Booths / 360 Booths",
            "Kids' Entertainment (Clowns, Inflatables)",
            "Corporate Giveaways",
            "Exhibition Fabricators",
            "Other Specialized Services (open-ended)",
        ],
    ),
]


db = SessionLocal()

for old_name, new_name, new_subcategory_names in CATEGORY_RENAMES:

    category = (
        db.query(Category)
        .filter(Category.name == old_name)
        .first()
    )

    if not category:
        # Either already renamed on a previous run, or this DB was
        # seeded fresh with the new names already in categories.py.
        category = (
            db.query(Category)
            .filter(Category.name == new_name)
            .first()
        )

        if not category:
            print(f"SKIP: neither '{old_name}' nor '{new_name}' found.")
            continue

        print(f"'{new_name}' already up to date (id {category.id}).")
    else:
        category.name = new_name
        db.commit()
        print(f"Renamed '{old_name}' -> '{new_name}' (id {category.id}).")

    existing_subcategories = (
        db.query(SubCategory)
        .filter(SubCategory.category_id == category.id)
        .all()
    )

    existing_names = {row.name for row in existing_subcategories}
    target_names = set(new_subcategory_names)

    removed = 0

    for row in existing_subcategories:
        if row.name not in target_names:
            db.delete(row)
            removed += 1

    db.commit()

    if removed:
        print(f"  Removed {removed} outdated subcategory row(s).")

    inserted = 0

    for name in new_subcategory_names:
        if name not in existing_names:
            db.add(
                SubCategory(
                    category_id=category.id,
                    name=name,
                    description=name,
                )
            )
            inserted += 1

    db.commit()

    if inserted:
        print(f"  Inserted {inserted} new subcategory row(s).")

db.close()

print("Done.")
