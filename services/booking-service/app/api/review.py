from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewStats
)

from app.crud.review import (
    create_review,
    get_booking_review,
    get_provider_reviews,
    get_review_stats,
    ReviewError
)

from app.core.service_auth import current_user, ensure_self_or_admin

router = APIRouter(
    prefix="/bookings",
    tags=["Reviews"]
)


@router.post(
    "/review",
    response_model=ReviewResponse
)
def submit_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_self_or_admin(user, payload.customer_id)

    try:
        return create_review(db, payload)

    except ReviewError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.get(
    "/reviews/stats",
    response_model=ReviewStats
)
def review_stats(
    db: Session = Depends(get_db)
):
    return get_review_stats(db)


@router.get(
    "/{booking_id}/review",
    response_model=ReviewResponse | None
)
def get_review_for_booking(
    booking_id: UUID,
    db: Session = Depends(get_db)
):
    return get_booking_review(db, booking_id)


@router.get(
    "/provider/{provider_id}/reviews",
    response_model=list[ReviewResponse]
)
def list_provider_reviews(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    return get_provider_reviews(db, provider_id)
