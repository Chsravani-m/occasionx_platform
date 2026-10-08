from datetime import date

from pydantic import BaseModel


class AutoPackageRequest(BaseModel):
    event_type_id: str
    budget: float
    guest_count: int

    state_id: int
    district_id: int
    location_id: int

    event_date: date | None = None


class BreakdownItem(BaseModel):
    category: str
    cost: float


class AutoPackageService(BaseModel):
    provider_id: str
    provider_name: str

    service_id: str
    service_name: str

    category_id: str
    category_name: str

    pricing_id: str | None = None
    price: float
    pricing_type: str | None = None
    unit: str | None = None
    min_quantity: float | None = None
    max_quantity: float | None = None
    occupancy_per_room: float | None = None
    total_rooms: int | None = None

    rating: float = 0


class AutoPackageResponse(BaseModel):
    available: bool
    message: str | None = None

    estimated_cost: float = 0
    providers_count: int = 0

    breakdown: list[BreakdownItem] = []
    services: list[AutoPackageService] = []
