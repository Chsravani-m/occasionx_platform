from app.db.models.subcategory import SubCategory


def get_subcategories_by_category(
    db,
    category_id
):
    return (
        db.query(SubCategory)
        .filter(
            SubCategory.category_id == category_id
        )
        .order_by(SubCategory.name)
        .all()
    )


def get_subcategory_by_id(db, subcategory_id):
    return (
        db.query(SubCategory)
        .filter(SubCategory.id == subcategory_id)
        .first()
    )


def create_subcategory(db, category_id, payload):
    subcategory = SubCategory(
        category_id=category_id,
        name=payload.name,
        description=payload.description
    )

    db.add(subcategory)
    db.commit()
    db.refresh(subcategory)

    return subcategory


def update_subcategory(db, subcategory_id, payload):
    subcategory = get_subcategory_by_id(db, subcategory_id)

    if not subcategory:
        return None

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(subcategory, field, value)

    db.commit()
    db.refresh(subcategory)

    return subcategory


def delete_subcategory(db, subcategory_id):
    subcategory = get_subcategory_by_id(db, subcategory_id)

    if not subcategory:
        return None

    db.delete(subcategory)
    db.commit()

    return True