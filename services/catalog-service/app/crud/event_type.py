from app.db.models.event_type import EventType


def get_all_event_types(db):
    return db.query(EventType).order_by(EventType.name).all()


def get_event_type_by_id(db, event_type_id):
    return (
        db.query(EventType)
        .filter(EventType.id == event_type_id)
        .first()
    )


def create_event_type(db, payload):
    event_type = EventType(
        name=payload.name,
        description=payload.description,
        is_inbuilt=payload.is_inbuilt
    )

    db.add(event_type)
    db.commit()
    db.refresh(event_type)

    return event_type


def update_event_type(db, event_type_id, payload):
    event_type = get_event_type_by_id(db, event_type_id)

    if not event_type:
        return None

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(event_type, field, value)

    db.commit()
    db.refresh(event_type)

    return event_type


def delete_event_type(db, event_type_id):
    event_type = get_event_type_by_id(db, event_type_id)

    if not event_type:
        return None

    db.delete(event_type)
    db.commit()

    return True