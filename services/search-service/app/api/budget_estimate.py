from fastapi import APIRouter

from app.schemas.budget_estimate import (
    BudgetEstimateRequest,
    BudgetEstimateResponse,
)
from app.services.budget_estimate import BudgetEstimateService

router = APIRouter(
    prefix="/budget",
    tags=["Budget Estimate"],
)


@router.post(
    "/estimate",
    response_model=BudgetEstimateResponse,
)
async def estimate_budget(payload: BudgetEstimateRequest):
    result = await BudgetEstimateService.estimate(
        event_type_id=payload.event_type_id,
        budget=payload.budget,
        guest_count=payload.guest_count,
        state_id=payload.state_id,
        district_id=payload.district_id,
        location_id=payload.location_id,
        event_date=payload.event_date,
    )

    return BudgetEstimateResponse(**result)
