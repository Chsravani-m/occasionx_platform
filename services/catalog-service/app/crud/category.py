from app.db.models.category import Category


def get_all_categories(db):
    return db.query(Category).order_by(Category.name).all()


def get_category_by_id(db, category_id):
    return (
        db.query(Category)
        .filter(Category.id == category_id)
        .first()
    )


def create_category(db, payload):
    category = Category(
        name=payload.name,
        description=payload.description
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


def update_category(db, category_id, payload):
    category = get_category_by_id(db, category_id)

    if not category:
        return None

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


def delete_category(db, category_id):
    category = get_category_by_id(db, category_id)

    if not category:
        return None

    db.delete(category)
    db.commit()

    return True