from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.crud.event_type_category import (
    get_categories_for_event_type
)

from app.schemas.category import (
    CategoryResponse
)

router = APIRouter(
    prefix="/event-types",
    tags=["Event Type Categories"]
)


@router.get(
    "/{event_type_id}/categories",
    response_model=list[CategoryResponse]
)
def get_event_categories(
    event_type_id: UUID,
    db: Session = Depends(get_db)
):
    return get_categories_for_event_type(
        db,
        event_type_id
    )