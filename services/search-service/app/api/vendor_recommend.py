from fastapi import APIRouter

from app.schemas.vendor_recommend import (
    VendorRecommendRequest,
    VendorRecommendResponse,
)
from app.services.vendor_recommend import VendorRecommendService

router = APIRouter(
    prefix="/vendor",
    tags=["Vendor Recommend"],
)


@router.post(
    "/recommend",
    response_model=VendorRecommendResponse,
)
async def recommend_vendors(payload: VendorRecommendRequest):
    result = await VendorRecommendService.recommend(
        category_id=payload.category_id,
        category_name=payload.category_name,
        guest_count=payload.guest_count,
        state_id=payload.state_id,
        district_id=payload.district_id,
        location_id=payload.location_id,
        budget=payload.budget,
        event_date=payload.event_date,
        limit=payload.limit,
    )

    return VendorRecommendResponse(**result)
