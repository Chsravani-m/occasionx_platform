from fastapi import APIRouter

from app.services.budget_calculator import (
    BudgetCalculatorService
)

router = APIRouter(
    prefix="/search/packages",
    tags=["Budget Calculator"]
)


@router.post("/calculate")
async def calculate_budget(
    payload: dict
):

    return await BudgetCalculatorService.calculate(
        payload["service_ids"],
        payload["budget"]
    )