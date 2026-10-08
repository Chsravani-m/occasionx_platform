from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.blocked_date import (
    BlockedDateCreate,
    BlockedDateUpdate,
    BlockedDateResponse
)

from app.crud.blocked_date import (
    create_blocked_date,
    get_service_blocked_dates,
    update_blocked_date,
    delete_blocked_date
)

router = APIRouter(
    prefix="/providers",
    tags=["Blocked Dates"]
)


@router.post(
    "/services/{service_id}/blocked-dates",
    response_model=BlockedDateResponse
)
def create_service_blocked_date(
    service_id: UUID,
    request: BlockedDateCreate,
    db: Session = Depends(get_db)
):
    return create_blocked_date(
        db,
        service_id,
        request
    )


@router.get(
    "/services/{service_id}/blocked-dates",
    response_model=list[
        BlockedDateResponse
    ]
)
def get_blocked_dates(
    service_id: UUID,
    db: Session = Depends(get_db)
):
    return get_service_blocked_dates(
        db,
        service_id
    )


@router.put(
    "/blocked-dates/{blocked_id}",
    response_model=BlockedDateResponse
)
def update_service_blocked_date(
    blocked_id: UUID,
    request: BlockedDateUpdate,
    db: Session = Depends(get_db)
):
    blocked = update_blocked_date(
        db,
        blocked_id,
        request
    )

    if not blocked:
        raise HTTPException(
            status_code=404,
            detail="Blocked date not found"
        )

    return blocked


@router.delete(
    "/blocked-dates/{blocked_id}"
)
def remove_blocked_date(
    blocked_id: UUID,
    db: Session = Depends(get_db)
):
    deleted = delete_blocked_date(
        db,
        blocked_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Blocked date not found"
        )

    return {
        "message": "Blocked date deleted"
    }