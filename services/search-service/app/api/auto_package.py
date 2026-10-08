from fastapi import APIRouter

from app.schemas.auto_package import (
    AutoPackageRequest,
    AutoPackageResponse,
)
from app.services.auto_package import AutoPackageBuilder

router = APIRouter(
    prefix="/search/packages",
    tags=["Auto Package"],
)


@router.post(
    "/auto-build",
    response_model=AutoPackageResponse,
)
async def build_auto_package(payload: AutoPackageRequest):
    result = await AutoPackageBuilder.build(
        event_type_id=payload.event_type_id,
        budget=payload.budget,
        guest_count=payload.guest_count,
        state_id=payload.state_id,
        district_id=payload.district_id,
        location_id=payload.location_id,
        event_date=payload.event_date,
    )

    return AutoPackageResponse(**result)
