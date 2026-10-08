from app.db.models.pricing import Pricing


def create_pricing(
    db,
    service_id,
    pricing_data
):
    pricing = Pricing(
        service_id=service_id,
        **pricing_data.model_dump()
    )

    db.add(pricing)

    db.commit()

    db.refresh(pricing)

    return pricing


def get_service_pricing(
    db,
    service_id
):
    return (
        db.query(Pricing)
        .filter(
            Pricing.service_id
            == service_id
        )
        .all()
    )

def get_pricing_by_id(
    db,
    pricing_id
):
    return (
        db.query(Pricing)
        .filter(
            Pricing.id == pricing_id
        )
        .first()
    )


def update_pricing(
    db,
    pricing_id,
    pricing_data
):
    pricing = get_pricing_by_id(
        db,
        pricing_id
    )

    if not pricing:
        return None

    updates = pricing_data.model_dump(
        exclude_unset=True
    )

    for field, value in updates.items():
        setattr(
            pricing,
            field,
            value
        )

    db.commit()
    db.refresh(pricing)

    return pricing


def delete_pricing(
    db,
    pricing_id
):
    pricing = get_pricing_by_id(
        db,
        pricing_id
    )

    if not pricing:
        return False

    db.delete(pricing)

    db.commit()

    return True