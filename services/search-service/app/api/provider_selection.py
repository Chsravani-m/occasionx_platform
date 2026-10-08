
from datetime import date
from uuid import UUID
from fastapi import APIRouter

from app.services.provider_selection import (
    ProviderSelectionService
)

router = APIRouter(
    prefix="/search/packages",
    tags=["Package Builder"]
)


@router.get("/{package_id}/providers")
async def get_package_providers(
    package_id: UUID,
    state: int,
    district: int,
    location: int,
    event_date: date | None = None
):

    return await ProviderSelectionService.get_providers_for_package(
        package_id,
        state,
        district,
        location,
        event_date
    )