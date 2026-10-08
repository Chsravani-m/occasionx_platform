from fastapi import APIRouter

from app.services.package_recommendation import (
    PackageRecommendationService
)
from app.schemas.package_recommendation import (
    PackageRecommendationRequest
)

router = APIRouter(
    prefix="/search/packages",
    tags=["Package Recommendation"]
)


@router.post("/recommend")
async def recommend_packages(
    payload: PackageRecommendationRequest
):
    return await PackageRecommendationService.recommend_packages(
        payload.event_type_id,
        payload.budget,
        payload.guest_count,
        payload.state_id,
        payload.district_id,
        payload.location_id,
        payload.event_date
    )