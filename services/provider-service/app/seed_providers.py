"""
One-off script to bulk-seed test/demo providers - each with a real
login account, services and pricing - directly into the database.
Skips the real signup -> subscription payment -> email activation
flow entirely; purely for populating search/browse/booking test data
quickly.

Run this once, from inside services/provider-service (so its own
.env / venv is active):

    python -m app.seed_providers

What it does:
    - Targets exactly the two locations in TARGET_LOCATIONS below
      (resolved by name against whatever States/Districts/Locations
      already exist in occasionx_catalog_db - it never invents new
      catalog data, only reuses what's already seeded there).
    - Only seeds Categories that are actually used by the event types
      in TARGET_EVENT_TYPES (copied from catalog-service's
      app/seeders/event_type_categories.py - Wedding, Birthday Party,
      House Warming), so search/package-building for those event
      types has real results at both locations.
    - For every (category, location) pair, creates somewhere between
      MIN_PROVIDERS_PER_CATEGORY_PER_LOCATION and
      MAX_PROVIDERS_PER_CATEGORY_PER_LOCATION providers (skips pairs
      that already have at least that many seeded providers, so it's
      safe to re-run after adding new categories or locations).
    - Each provider gets: a real "users" row in occasionx_auth_db
      (role=PROVIDER, verified, active), a Provider row that's
      already verification_status=VERIFIED / account_activated=True /
      registration_fee_paid=True (so it shows up in search
      immediately, no manual approval needed), one ProviderCategory
      link, 1-2 Services in that category, one Pricing row per
      service with a category-appropriate pricing_type/price range,
      and a few Portfolio (placeholder image) rows so provider detail
      pages have a cover photo and gallery instead of a blank one.

Every seeded provider can log in at /signin with:
    email:    printed per-provider below (also queryable later via
              "... WHERE business_name LIKE '%(Seed)%'")
    password: Provider@123   (see SEED_PASSWORD below)

Safe to re-run: (category, location) pairs that already have
>= MAX_PROVIDERS_PER_CATEGORY_PER_LOCATION seeded providers (matched
by the "(Seed)" marker in business_name) are skipped.
"""

import random
import re
import uuid

from passlib.context import CryptContext

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.database import DATABASE_URL, SessionLocal
from app.db.models.provider import Provider
from app.db.models.provider_categories import ProviderCategory
from app.db.models.service import Service
from app.db.models.pricing import Pricing
from app.db.models.portfolio import Portfolio


# Each (category, location) pair gets a random number of providers in
# this range, instead of always exactly one - so search/comparison
# pages have real choices to show instead of a single result.
MIN_PROVIDERS_PER_CATEGORY_PER_LOCATION = 2
MAX_PROVIDERS_PER_CATEGORY_PER_LOCATION = 3

PORTFOLIO_IMAGES_PER_PROVIDER = 3

SEED_PASSWORD = "Provider@123"
SEED_MARKER = "(Seed)"

# (state name, district name, location name) - resolved by name
# against occasionx_catalog_db at runtime. Add more triples here to
# seed additional locations.
TARGET_LOCATIONS = [
    ("Telangana", "Rangareddy", "Rajendra Nagar"),
    ("Andhra Pradesh", "Visakhapatnam", "Madhurawada"),
]

# Copied from catalog-service's
# app/seeders/event_type_categories.py - only the entries relevant to
# TARGET_EVENT_TYPES, kept in sync manually since this script can't
# import across services.
TARGET_EVENT_TYPES = [
    "Wedding", "Engagement", "Birthday Party", "House Warming",
]

EVENT_TYPE_CATEGORY_MAPPING = {
    "Wedding": [
        "Photography & Videography", "Videography", "Decor & Ambience",
        "Venues & Locations", "Catering & Food", "Entertainment",
        "Outfits & Styling", "Event Essentials", "Invitations & Gifting",
        "Audio Visual", "Travel & Logistics", "Accommodation",
        "Wedding Services", "Florists", "Rental Services",
        "Fireworks & Effects", "Destination Weddings", "Gifting Solutions",
        "Spiritual & Ritual Services",
    ],
    "Engagement": [
        "Photography & Videography", "Videography", "Decor & Ambience",
        "Venues & Locations", "Catering & Food", "Entertainment",
        "Outfits & Styling", "Invitations & Gifting", "Florists",
        "Cake & Bakery", "Spiritual & Ritual Services",
    ],
    "Birthday Party": [
        "Photography & Videography", "Videography", "Decor & Ambience",
        "Catering & Food", "Entertainment", "Kids Entertainment",
        "Cake & Bakery", "Food Stalls", "Gifting Solutions",
        "Special Add-Ons",
    ],
    "House Warming": [
        "Decor & Ambience", "Catering & Food", "Spiritual & Ritual Services",
        "Photography & Videography", "Florists", "Cake & Bakery",
    ],
}

TARGET_CATEGORY_NAMES = sorted(
    {
        category_name
        for event_type in TARGET_EVENT_TYPES
        for category_name in EVENT_TYPE_CATEGORY_MAPPING[event_type]
    }
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def swap_db_name(url: str, db_name: str) -> str:
    return re.sub(r"/[^/]+$", f"/{db_name}", url)


AUTH_DATABASE_URL = swap_db_name(DATABASE_URL, "occasionx_auth_db")
CATALOG_DATABASE_URL = swap_db_name(DATABASE_URL, "occasionx_catalog_db")

auth_engine = create_engine(AUTH_DATABASE_URL)
catalog_engine = create_engine(CATALOG_DATABASE_URL)

AuthSession = sessionmaker(bind=auth_engine)


BUSINESS_ADJECTIVES = [
    "Royal", "Golden", "Elite", "Grand", "Silver", "Premier", "Sunrise",
    "Blue Sky", "Star", "Classic", "Diamond", "Elegant", "Modern",
    "Heritage", "Urban", "Divine", "Radiant", "Prime",
]

BUSINESS_SUFFIXES = [
    "Events", "Services", "Studio", "Co.", "Creations", "Hub",
    "Experts", "Solutions", "House", "Collective",
]

OWNER_FIRST_NAMES = [
    "Arjun", "Priya", "Rohan", "Sneha", "Vikram", "Anita", "Karthik",
    "Meera", "Suresh", "Divya", "Amit", "Pooja", "Rahul", "Kavya",
]

OWNER_LAST_NAMES = [
    "Sharma", "Reddy", "Nair", "Iyer", "Patel", "Rao", "Menon",
    "Gupta", "Verma", "Pillai",
]

# Category-name keyword -> pricing profile. Matched case-insensitively
# as a substring against the category name, first match wins; falls
# back to DEFAULT_PROFILE. Only the 7 pricing_type values the
# PricingCreate schema actually accepts are used here: FIXED, HOURLY,
# PACKAGE, PER_PERSON, PER_PLATE, PER_DAY, CUSTOM.
#
# Entry shape: (keywords, pricing_type, unit, min_quantity,
# max_quantity, has_room_inventory, price_min, price_max)
#
# has_room_inventory is only ever True for Accommodation - it's what
# adds occupancy_per_room/total_rooms, which only make sense for
# room-based stays (Venue is intentionally PER_DAY *without* room
# inventory - a banquet hall isn't billed per room).
#
# "kids" is checked before the generic "entertainment" keyword so
# Kids Entertainment doesn't fall through to the Entertainment profile
# (its name contains "entertainment" too).
CATEGORY_PRICING_PROFILES = [
    (["accommodation", "stay", "hotel"], "PER_DAY", "day", 1, 10, True, 3000, 12000),
    # min_quantity=1 (not a large minimum like Catering) - a makeup
    # provider shouldn't force a customer to pay for 10 people when
    # only 3-4 actually need the service. max_quantity=10 caps it at
    # the platform-wide MAX_PEOPLE_QUANTITY so the customer picks
    # freely within a realistic range instead of the full guest list.
    (["makeup", "grooming", "outfit", "styling"], "PER_PERSON", "person", 1, 10, False, 500, 2500),
    (["cater", "food"], "PER_PLATE", "plate", 50, 1000, False, 300, 1200),
    (["photo", "video"], "HOURLY", "hour", None, None, False, 2000, 8000),
    (["kids"], "PACKAGE", "package", None, None, False, 4000, 15000),
    (["entertainment"], "HOURLY", "hour", None, None, False, 5000, 20000),
    (["decor"], "PACKAGE", "package", None, None, False, 10000, 60000),
    (["venue"], "PER_DAY", "day", None, None, False, 15000, 80000),
    (["event planning", "event essentials"], "PACKAGE", "package", None, None, False, 15000, 100000),
    (["invitation"], "PER_PERSON", "card", 100, 2000, False, 10, 60),
    (["audio visual"], "PER_DAY", "day", None, None, False, 5000, 25000),
    (["transport", "travel"], "FIXED", "vehicle", None, None, False, 3000, 15000),
    (["wedding services"], "PACKAGE", "package", None, None, False, 5000, 50000),
    (["florist"], "FIXED", "arrangement", None, None, False, 2000, 20000),
    (["rental services"], "FIXED", "item", None, None, False, 1000, 15000),
    (["fireworks"], "FIXED", "show", None, None, False, 5000, 30000),
    (["destination weddings"], "PACKAGE", "package", None, None, False, 50000, 300000),
    (["gifting solutions"], "PER_PERSON", "gift", 50, 1000, False, 100, 1500),
    (["cake"], "FIXED", "cake", None, None, False, 800, 6000),
    (["special attractions", "special add-ons", "special add"], "PACKAGE", "package", None, None, False, 5000, 40000),
    (["ritual", "spiritual", "purohit", "pandit", "priest"], "PACKAGE", "package", None, None, False, 3000, 25000),
]

DEFAULT_PROFILE = ("FIXED", None, None, None, False, 10000, 80000)


def profile_for(category_name: str):
    """Returns (pricing_type, unit, min_quantity, max_quantity,
    has_room_inventory, price_min, price_max) for a category name."""

    lower = category_name.lower()

    for entry in CATEGORY_PRICING_PROFILES:
        keywords = entry[0]

        if any(keyword in lower for keyword in keywords):
            return entry[1:]

    return DEFAULT_PROFILE


def price_for(profile):
    """Returns (pricing_type, amount, unit, min_quantity, max_quantity,
    occupancy_per_room, total_rooms) for one Pricing row, given a
    profile from profile_for()."""

    (
        pricing_type, unit, min_qty, max_qty,
        has_room_inventory, price_min, price_max,
    ) = profile

    amount = random.randint(price_min, price_max)

    occupancy_per_room = 2 if has_room_inventory else None
    total_rooms = random.randint(5, 20) if has_room_inventory else None

    return (
        pricing_type, amount, unit, min_qty, max_qty,
        occupancy_per_room, total_rooms,
    )


def business_name_for(category_name: str) -> str:
    adjective = random.choice(BUSINESS_ADJECTIVES)
    suffix = random.choice(BUSINESS_SUFFIXES)
    return f"{adjective} {category_name} {suffix} {SEED_MARKER}"


def owner_name():
    return (
        random.choice(OWNER_FIRST_NAMES)
        + " "
        + random.choice(OWNER_LAST_NAMES)
    )


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def random_phone() -> str:
    # provider-service's own "phone" column has no uniqueness
    # constraint (unlike auth-service's users.phone), so this doesn't
    # need to be checked for collisions - just needs to be non-null,
    # since ProviderResponse requires a str (not Optional).
    return "9" + "".join(str(random.randint(0, 9)) for _ in range(9))


def unique_email(auth_db, slug: str) -> str:
    base = f"{slug}@seed.occasionx.local"
    email = base
    n = 1

    while auth_db.execute(
        text("SELECT 1 FROM users WHERE email = :email"),
        {"email": email},
    ).first():
        n += 1
        email = f"{slug}{n}@seed.occasionx.local"

    return email


def unique_phone(auth_db) -> str:
    while True:
        phone = "9" + "".join(
            str(random.randint(0, 9)) for _ in range(9)
        )

        exists = auth_db.execute(
            text("SELECT 1 FROM users WHERE phone = :phone"),
            {"phone": phone},
        ).first()

        if not exists:
            return phone


def fetch_categories():
    """Only the categories used by TARGET_EVENT_TYPES (via
    TARGET_CATEGORY_NAMES) that actually exist in the catalog DB.
    Prints a warning for any target category name that isn't found
    (e.g. catalog hasn't been fully seeded yet)."""

    with catalog_engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, name FROM categories ORDER BY name")
        ).fetchall()

    by_name = {row.name: row.id for row in rows}

    matched = [
        (by_name[name], name)
        for name in TARGET_CATEGORY_NAMES
        if name in by_name
    ]

    missing = [
        name for name in TARGET_CATEGORY_NAMES if name not in by_name
    ]

    if missing:
        print(
            "Note: these categories aren't in occasionx_catalog_db "
            f"yet, so they'll be skipped: {', '.join(missing)}"
        )

    return matched


def fetch_subcategories(category_id):
    with catalog_engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, name FROM subcategories "
                "WHERE category_id = :category_id"
            ),
            {"category_id": category_id},
        ).fetchall()

    return [(row.id, row.name) for row in rows]


def resolve_locations():
    """Resolves TARGET_LOCATIONS (by name) against the catalog DB.
    Returns a list of (state_id, district_id, location_id, label)
    tuples - only for triples that actually matched. Prints a warning
    for any TARGET_LOCATIONS entry that didn't resolve."""

    resolved = []

    with catalog_engine.connect() as conn:

        for state_name, district_name, location_name in TARGET_LOCATIONS:

            row = conn.execute(
                text(
                    "SELECT s.id AS state_id, d.id AS district_id, "
                    "l.id AS location_id "
                    "FROM locations l "
                    "JOIN districts d ON d.id = l.district_id "
                    "JOIN states s ON s.id = d.state_id "
                    "WHERE s.name ILIKE :state "
                    "AND d.name ILIKE :district "
                    "AND l.name ILIKE :location"
                ),
                {
                    "state": state_name,
                    "district": district_name,
                    "location": location_name,
                },
            ).fetchone()

            label = f"{location_name}, {district_name}, {state_name}"

            if row:
                resolved.append(
                    (row.state_id, row.district_id, row.location_id, label)
                )
            else:
                print(
                    f"Note: couldn't find '{label}' in "
                    "occasionx_catalog_db - skipping it. Check the "
                    "state/district/location names exist there "
                    "(location_seed.py)."
                )

    return resolved


def create_auth_user(auth_db, business_name: str, owner: str):
    slug = slugify(business_name)[:20] or "provider"

    email = unique_email(auth_db, slug)
    phone = unique_phone(auth_db)
    password_hash = pwd_context.hash(SEED_PASSWORD)
    user_id = uuid.uuid4()

    auth_db.execute(
        text(
            """
            INSERT INTO users (
                id, full_name, email, phone, password_hash, role,
                is_active, is_verified, is_phone_verified,
                created_at, updated_at
            )
            VALUES (
                :id, :full_name, :email, :phone,
                :password_hash, 'PROVIDER', true, true, true,
                now(), now()
            )
            """
        ),
        {
            "id": str(user_id),
            "full_name": owner,
            "email": email,
            "phone": phone,
            "password_hash": password_hash,
        },
    )

    auth_db.commit()

    return user_id, email


def seed():
    categories = fetch_categories()

    if not categories:
        print(
            "None of the target categories "
            f"({', '.join(TARGET_CATEGORY_NAMES)}) were found in "
            "occasionx_catalog_db - seed catalog data first "
            "(catalog-service's app/seeders/seed_all.py)."
        )
        return

    locations = resolve_locations()

    if not locations:
        print(
            "None of TARGET_LOCATIONS resolved against "
            "occasionx_catalog_db - nothing to seed. Check the "
            "state/district/location names are spelled exactly as "
            "seeded there."
        )
        return

    db = SessionLocal()
    auth_db = AuthSession()

    created_count = 0

    try:

        for category_id, category_name in categories:

            subcategories = fetch_subcategories(category_id)
            profile = profile_for(category_name)

            for state_id, district_id, location_id, location_label in locations:

                existing_seeded = (
                    db.query(Provider)
                    .join(
                        ProviderCategory,
                        Provider.id == ProviderCategory.provider_id,
                    )
                    .filter(
                        ProviderCategory.category_id == category_id,
                        Provider.location_id == location_id,
                        Provider.business_name.like(f"%{SEED_MARKER}%"),
                    )
                    .count()
                )

                target = random.randint(
                    MIN_PROVIDERS_PER_CATEGORY_PER_LOCATION,
                    MAX_PROVIDERS_PER_CATEGORY_PER_LOCATION,
                )

                to_create = target - existing_seeded

                if to_create <= 0:
                    print(
                        f"Skipping {category_name} @ {location_label} "
                        f"- already has {existing_seeded} seeded "
                        "providers."
                    )
                    continue

                for _ in range(to_create):

                    business_name = business_name_for(category_name)
                    owner = owner_name()

                    user_id, email = create_auth_user(
                        auth_db, business_name, owner
                    )

                    provider = Provider(
                        user_id=user_id,
                        business_name=business_name,
                        owner_name=owner,
                        email=email,
                        phone=random_phone(),
                        state_id=state_id,
                        district_id=district_id,
                        location_id=location_id,
                        address=(
                            f"{business_name}, {location_label} "
                            "(seeded test address)"
                        ),
                        description=(
                            f"{business_name} offers {category_name} "
                            "services in "
                            f"{location_label}. (Seed data for testing.)"
                        ),
                        verification_status="VERIFIED",
                        registration_fee_paid=True,
                        account_activated=True,
                        onboarding_completed=True,
                        average_rating=round(
                            random.uniform(3.5, 5.0), 2
                        ),
                        total_reviews=random.randint(0, 40),
                    )

                    db.add(provider)
                    db.flush()

                    subcategory_id = (
                        random.choice(subcategories)[0]
                        if subcategories
                        else None
                    )

                    db.add(
                        ProviderCategory(
                            provider_id=provider.id,
                            category_id=category_id,
                            subcategory_id=subcategory_id,
                        )
                    )

                    # Seeded via picsum.photos, seeded by provider id
                    # so re-running the script doesn't churn image URLs
                    # for providers that already exist. These are just
                    # placeholder cover/gallery photos so provider
                    # detail pages don't show a blank image.
                    for image_index in range(PORTFOLIO_IMAGES_PER_PROVIDER):
                        db.add(
                            Portfolio(
                                provider_id=provider.id,
                                media_type="IMAGE",
                                media_url=(
                                    "https://picsum.photos/seed/"
                                    f"{provider.id}-{image_index}/800/600"
                                ),
                                title=f"{category_name} Work {image_index + 1}",
                                description=(
                                    f"Sample work by {business_name}. "
                                    "(Seed data for testing.)"
                                ),
                            )
                        )

                    for service_index in range(random.randint(1, 2)):

                        service_name = (
                            f"{category_name} Package "
                            f"{'Standard' if service_index == 0 else 'Premium'}"
                        )

                        service = Service(
                            provider_id=provider.id,
                            category_id=category_id,
                            subcategory_id=subcategory_id,
                            name=service_name,
                            description=(
                                f"{service_name} by {business_name}."
                            ),
                        )

                        db.add(service)
                        db.flush()

                        (
                            pricing_type, amount, unit, min_qty, max_qty,
                            occupancy_per_room, total_rooms,
                        ) = price_for(profile)

                        # Premium tier costs a bit more than standard.
                        if service_index == 1:
                            amount = round(amount * 1.4)

                        db.add(
                            Pricing(
                                service_id=service.id,
                                pricing_type=pricing_type,
                                amount=amount,
                                unit=unit,
                                min_quantity=min_qty,
                                max_quantity=max_qty,
                                occupancy_per_room=occupancy_per_room,
                                total_rooms=total_rooms,
                            )
                        )

                    db.commit()

                    created_count += 1

                    print(
                        f"Created: {business_name} | {category_name} "
                        f"@ {location_label} | login: {email} / "
                        f"{SEED_PASSWORD}"
                    )

        print(
            f"\nDone. Created {created_count} providers. "
            f"All log in with password: {SEED_PASSWORD}"
        )

    finally:
        db.close()
        auth_db.close()


if __name__ == "__main__":
    seed()
