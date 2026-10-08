from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.crud.event_type import (
    get_all_event_types,
    create_event_type,
    update_event_type,
    delete_event_type
)

from app.schemas.event_type import (
    EventTypeResponse,
    EventTypeCreateRequest,
    EventTypeUpdateRequest
)

router = APIRouter(
    prefix="/event-types",
    tags=["Event Types"]
)


@router.get(
    "",
    response_model=list[EventTypeResponse]
)
def get_event_types(
    db: Session = Depends(get_db)
):
    return get_all_event_types(db)


@router.post(
    "",
    response_model=EventTypeResponse
)
def create_event_type_api(
    payload: EventTypeCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        return create_event_type(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An event type with this name already exists."
        )


@router.put(
    "/{event_type_id}",
    response_model=EventTypeResponse
)
def update_event_type_api(
    event_type_id: UUID,
    payload: EventTypeUpdateRequest,
    db: Session = Depends(get_db)
):
    try:
        event_type = update_event_type(
            db, event_type_id, payload
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An event type with this name already exists."
        )

    if not event_type:
        raise HTTPException(
            status_code=404,
            detail="Event type not found"
        )

    return event_type


@router.delete("/{event_type_id}")
def delete_event_type_api(
    event_type_id: UUID,
    db: Session = Depends(get_db)
):
    try:
        deleted = delete_event_type(db, event_type_id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This event type is referenced elsewhere."
        )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Event type not found"
        )

    return {"message": "Event type deleted"}