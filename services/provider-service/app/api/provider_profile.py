from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.db.models.provider import Provider
from app.db.models.provider_categories import (
    ProviderCategory
)

from app.db.models.portfolio import Portfolio

from app.db.models.service import Service

from app.core.service_auth import optional_onboarding_user
from app.core.ownership import public_provider

router = APIRouter(
    prefix="/providers",
    tags=["Provider Profile"]
)

@router.get("/{provider_id}/profile")
def get_provider_profile(
    provider_id: UUID,
    db: Session = Depends(get_db),
    user: dict | None = Depends(optional_onboarding_user)
):

    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    categories = (
        db.query(ProviderCategory)
        .filter(
            ProviderCategory.provider_id
            == provider_id
        )
        .all()
    )

    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.provider_id
            == provider_id
        )
        .all()
    )

    services = (
        db.query(Service)
        .filter(
            Service.provider_id
            == provider_id
        )
        .all()
    )

    return {
        "provider": public_provider(provider, user),
        "categories": categories,
        "portfolio": portfolio,
        "services": services
    }