from app.db.models.blocked_date import BlockedDate


def create_blocked_date(
    db,
    service_id,
    blocked_data
):
    blocked = BlockedDate(
        service_id=service_id,
        **blocked_data.model_dump()
    )

    db.add(blocked)

    db.commit()

    db.refresh(blocked)

    return blocked


def get_service_blocked_dates(
    db,
    service_id
):
    return (
        db.query(BlockedDate)
        .filter(
            BlockedDate.service_id
            == service_id
        )
        .all()
    )


def get_blocked_date_by_id(
    db,
    blocked_id
):
    return (
        db.query(BlockedDate)
        .filter(
            BlockedDate.id == blocked_id
        )
        .first()
    )


def update_blocked_date(
    db,
    blocked_id,
    blocked_data
):
    blocked = get_blocked_date_by_id(
        db,
        blocked_id
    )

    if not blocked:
        return None

    updates = blocked_data.model_dump(
        exclude_unset=True
    )

    for field, value in updates.items():
        setattr(
            blocked,
            field,
            value
        )

    db.commit()

    db.refresh(blocked)

    return blocked


def delete_blocked_date(
    db,
    blocked_id
):
    blocked = get_blocked_date_by_id(
        db,
        blocked_id
    )

    if not blocked:
        return False

    db.delete(blocked)

    db.commit()

    return True