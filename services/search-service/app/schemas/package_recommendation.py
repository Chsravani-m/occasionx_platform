from datetime import date
from pydantic import BaseModel
from uuid import UUID

class PackageRecommendationRequest(
    BaseModel
):
    event_type_id: UUID
    budget: float
    guest_count: int

    state_id: int
    district_id: int
    location_id: int

    event_date: date | None = None

class PackageBreakdownResponse(
    BaseModel
):
    category: str

    cost: float


class RecommendedPackageResponse(
    BaseModel
):
    package_id: UUID

    package_name: str

    estimated_cost: float

    budget_fit: bool

    providers_count: int

    breakdown: list[
        PackageBreakdownResponse
    ]