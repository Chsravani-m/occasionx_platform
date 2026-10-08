from app.db.models.category import Category
from app.db.models.event_type_category import (
    EventTypeCategory
)


def get_categories_for_event_type(
    db,
    event_type_id
):
    return (
        db.query(Category)
        .join(
            EventTypeCategory,
            Category.id ==
            EventTypeCategory.category_id
        )
        .filter(
            EventTypeCategory.event_type_id
            == event_type_id
        )
        .all()
    )