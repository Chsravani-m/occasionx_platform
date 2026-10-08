from app.db.database import SessionLocal

from app.db.models.event_type import EventType
from app.db.models.category import Category
from app.db.models.subcategory import SubCategory
from app.db.models.event_type_category import (
    EventTypeCategory
)

from app.seeders.event_type_categories import (
    EVENT_TYPE_CATEGORY_MAPPING
)

from app.seeders.event_types import EVENT_TYPES
from app.seeders.categories import CATEGORIES
from app.seeders.subcategories import SUBCATEGORIES
from app.seeders.official_event_types import OFFICIAL_EVENT_TYPE_NAMES


def seed():

    db = SessionLocal()

    print("Seeding Event Types...")

    for name in EVENT_TYPES:

        exists = (
            db.query(EventType)
            .filter(EventType.name == name)
            .first()
        )

        if not exists:
            db.add(
                EventType(
                    name=name,
                    description=f"{name} event"
                )
            )

    db.commit()

    print("Flagging OX In-Built event types...")

    for name in OFFICIAL_EVENT_TYPE_NAMES:

        event = (
            db.query(EventType)
            .filter(EventType.name == name)
            .first()
        )

        if event and not event.is_inbuilt:
            event.is_inbuilt = True

    db.commit()

    print("Seeding Categories...")

    category_map = {}

    for name in CATEGORIES:

        category = (
            db.query(Category)
            .filter(Category.name == name)
            .first()
        )

        if not category:

            category = Category(
                name=name,
                description=f"{name} category"
            )

            db.add(category)
            db.commit()
            db.refresh(category)

        category_map[name] = category.id

    print("Seeding Subcategories...")

    for category_name, subcategory_list in SUBCATEGORIES.items():

        category_id = category_map.get(category_name)

        if not category_id:
            continue

        for subcategory_name in subcategory_list:

            exists = (
                db.query(SubCategory)
                .filter(
                    SubCategory.category_id == category_id,
                    SubCategory.name == subcategory_name
                )
                .first()
            )

            if not exists:

                db.add(
                    SubCategory(
                        category_id=category_id,
                        name=subcategory_name,
                        description=subcategory_name
                    )
                )

    db.commit()

    print("Seeding Event Type Categories...")

    for event_name, category_names in EVENT_TYPE_CATEGORY_MAPPING.items():

        event = (
            db.query(EventType)
            .filter(EventType.name == event_name)
            .first()
        )

        if not event:
            continue

        for category_name in category_names:

            category = (
                db.query(Category)
                .filter(Category.name == category_name)
                .first()
            )

            if not category:
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

    db.commit()

    print("Catalog Seed Completed")


if __name__ == "__main__":
    seed()

