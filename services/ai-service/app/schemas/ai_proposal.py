from pydantic import BaseModel


class BreakdownItem(BaseModel):
    category: str
    cost: float


class AIProposalRequest(BaseModel):
    event_type_name: str
    package_name: str

    budget: float
    guest_count: int

    estimated_cost: float
    breakdown: list[BreakdownItem]

    location_label: str | None = None
    event_date: str | None = None


class AIProposalResponse(BaseModel):
    available: bool
    proposal: str
