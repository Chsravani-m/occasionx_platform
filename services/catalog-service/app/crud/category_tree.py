from sqlalchemy.orm import joinedload

from app.db.models.category import Category


def get_categories_with_subcategories(db):

    categories = (
        db.query(Category)
        .options(
            joinedload(Category.subcategories)
        )
        .order_by(Category.name)
        .all()
    )

    result = []

    for category in categories:

        result.append(
            {
                "id": category.id,
                "name": category.name,
                "subcategories": [
                    {
                        "id": sub.id,
                        "name": sub.name
                    }
                    for sub in category.subcategories
                ]
            }
        )

    return result