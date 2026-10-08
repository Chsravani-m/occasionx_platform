from datetime import date

from pydantic import BaseModel


class VendorRecommendRequest(BaseModel):
    category_id: str
    category_name: str | None = None
    guest_count: int

    state_id: int
    district_id: int
    location_id: int

    budget: float | None = None
    event_date: date | None = None
    limit: int = 5


class VendorRecommendation(BaseModel):
    provider_id: str
    provider_name: str

    service_id: str
    service_name: str

    category_id: str | None = None
    category_name: str | None = None

    pricing_id: str | None = None
    price: float
    pricing_type: str | None = None
    unit: str | None = None
    min_quantity: float | None = None
    max_quantity: float | None = None
    occupancy_per_room: float | None = None
    total_rooms: int | None = None

    rating: float = 0

    estimated_cost: float = 0
    within_budget: bool = True


class VendorRecommendResponse(BaseModel):
    available: bool
    message: str | None = None

    category_id: str
    category_name: str | None = None

    budget: float | None = None
    total_options: int = 0

    recommendations: list[VendorRecommendation] = []
