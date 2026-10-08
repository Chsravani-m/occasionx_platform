from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from app.dependencies import get_db

from sqlalchemy.orm import Session

from app.schemas.pricing import (
    PricingCreate,
    PricingUpdate,
    PricingResponse
)

from app.crud.pricing import (
    create_pricing,
    get_service_pricing,
    get_pricing_by_id,
    update_pricing,
    delete_pricing
)

router = APIRouter(
    prefix="/providers",
    tags=["Pricing"]
)

@router.post(
    "/services/{service_id}/pricing",
    response_model=PricingResponse
)
def create_service_pricing(
    service_id: UUID,
    request: PricingCreate,
    db: Session = Depends(get_db)
):
    return create_pricing(
        db,
        service_id,
        request
    )

@router.get(
    "/services/{service_id}/pricing",
    response_model=list[
        PricingResponse
    ]
)
def get_pricing(
    service_id: UUID,
    db: Session = Depends(get_db)
):
    return get_service_pricing(
        db,
        service_id
    )

@router.get(
    "/pricing/{pricing_id}",
    response_model=PricingResponse
)
def get_single_pricing(
    pricing_id: UUID,
    db: Session = Depends(get_db)
):
    pricing = get_pricing_by_id(
        db,
        pricing_id
    )

    if not pricing:
        raise HTTPException(
            status_code=404,
            detail="Pricing not found"
        )

    return pricing

@router.put(
    "/pricing/{pricing_id}",
    response_model=PricingResponse
)
def update_service_pricing(
    pricing_id: UUID,
    request: PricingUpdate,
    db: Session = Depends(get_db)
):
    pricing = update_pricing(
        db,
        pricing_id,
        request
    )

    if not pricing:
        raise HTTPException(
            status_code=404,
            detail="Pricing not found"
        )

    return pricing

@router.delete(
    "/pricing/{pricing_id}"
)
def remove_pricing(
    pricing_id: UUID,
    db: Session = Depends(get_db)
):
    deleted = delete_pricing(
        db,
        pricing_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Pricing not found"
        )

    return {
        "message": "Pricing deleted"
    }