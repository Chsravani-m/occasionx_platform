from datetime import date

from pydantic import BaseModel


class BudgetEstimateRequest(BaseModel):
    event_type_id: str
    budget: float
    guest_count: int

    state_id: int
    district_id: int
    location_id: int

    event_date: date | None = None


class CategoryEstimate(BaseModel):
    category_id: str
    category_name: str

    estimated_cost: float = 0
    provider_count: int = 0

    min_price: float | None = None
    max_price: float | None = None

    note: str | None = None


class BudgetEstimateResponse(BaseModel):
    available: bool
    message: str | None = None

    budget: float = 0
    total_estimated_cost: float = 0
    within_budget: bool = True
    remaining_budget: float = 0

    categories_count: int = 0
    breakdown: list[CategoryEstimate] = []
