"""
One-off fix for demo data seeded before the Makeup & Grooming pricing
profile was corrected.

The original seed profile set min_quantity=10 for Makeup & Grooming
services, which forced every booking to be priced for at least 10
people (via getEffectiveQuantity's Math.max(quantity, minQuantity)
floor on the frontend) - even if a customer only needed makeup for
3-4 people. seed_providers.py's CATEGORY_PRICING_PROFILES has been
fixed to use min_quantity=1 going forward, but that only affects
newly-seeded providers. This script patches the pricing rows for
providers that were already seeded under the old profile.

Run this once, from inside services/provider-service (so its own
.env / venv is active):

    python -m app.fix_grooming_min_quantity

Safe to re-run - it's a plain UPDATE keyed on category name, not
tied to the "(Seed)" marker, so it also fixes real (non-seed)
Makeup & Grooming pricing rows that were created with the old
min_quantity=10 default while this bug was live.
"""

import re

from sqlalchemy import create_engine, text

from app.db.database import DATABASE_URL


def swap_db_name(url: str, db_name: str) -> str:
    return re.sub(r"/[^/]+$", f"/{db_name}", url)


CATALOG_DATABASE_URL = swap_db_name(DATABASE_URL, "occasionx_catalog_db")

provider_engine = create_engine(DATABASE_URL)
catalog_engine = create_engine(CATALOG_DATABASE_URL)


def main():
    with catalog_engine.connect() as conn:
        category_ids = [
            str(row[0])
            for row in conn.execute(
                text(
                    "SELECT id FROM categories "
                    "WHERE name ILIKE '%makeup%' OR name ILIKE '%grooming%'"
                )
            ).fetchall()
        ]

    if not category_ids:
        print("No Makeup/Grooming category found in occasionx_catalog_db - nothing to do.")
        return

    with provider_engine.connect() as conn:
        service_ids = [
            str(row[0])
            for row in conn.execute(
                text(
                    "SELECT id FROM provider_services "
                    "WHERE category_id = ANY(:category_ids)"
                ),
                {"category_ids": category_ids},
            ).fetchall()
        ]

        if not service_ids:
            print("No Makeup/Grooming services found - nothing to do.")
            return

        result = conn.execute(
            text(
                "UPDATE service_pricing "
                "SET min_quantity = 1, max_quantity = 10 "
                "WHERE service_id = ANY(:service_ids) "
                "AND pricing_type = 'PER_PERSON'"
            ),
            {"service_ids": service_ids},
        )
        conn.commit()

        print(f"Updated {result.rowcount} Makeup & Grooming pricing row(s): "
              f"min_quantity -> 1, max_quantity -> 10.")


if __name__ == "__main__":
    main()
