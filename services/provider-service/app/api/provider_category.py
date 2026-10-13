from datetime import date as date_type
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from fastapi import HTTPException

from app.dependencies import get_db

from app.schemas.provider_category import (
    ProviderCategoryCreate,
    ProviderCategoryResponse
)

from app.crud.provider_category import (
    assign_categories,
    get_provider_categories,
    delete_provider_category,
    get_providers_for_category
)

from app.core.service_auth import onboarding_user
from app.core.ownership import ensure_can_manage_provider

router = APIRouter(
    prefix="/providers",
    tags=["Provider Categories"]
)

@router.get(
    "/category/{category_id}"
)
def get_providers_by_category(
    category_id: UUID,
    state_id: int | None = None,
    district_id: int | None = None,
    location_id: int | None = None,
    event_date: date_type | None = None,
    db: Session = Depends(get_db)
):
    return get_providers_for_category(
        db,
        category_id,
        state_id,
        district_id,
        location_id,
        event_date
    )

@router.post(
    "/{provider_id}/categories",
    response_model=list[
        ProviderCategoryResponse
    ]
)
def assign_provider_categories(
    provider_id: UUID,
    request: ProviderCategoryCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_provider(db, user, provider_id)

    return assign_categories(
        db,
        provider_id,
        request
    )

@router.get(
    "/{provider_id}/categories",
    response_model=list[
        ProviderCategoryResponse
    ]
)
def get_categories(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    return get_provider_categories(
        db,
        provider_id
    )

@router.delete(
    "/{provider_id}/categories/{mapping_id}"
)
def delete_category(
    provider_id: UUID,
    mapping_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_provider(db, user, provider_id)

    deleted = delete_provider_category(
        db,
        provider_id,
        mapping_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Category mapping not found"
        )

    return {
        "message": "Category removed successfully"
    }

@router.put(
    "/{provider_id}/categories",
    response_model=list[
        ProviderCategoryResponse
    ]
)
def update_provider_categories(
    provider_id: UUID,
    request: ProviderCategoryCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_provider(db, user, provider_id)

    return assign_categories(
        db,
        provider_id,
        request
    )