from uuid import UUID
from pydantic import BaseModel


class PortfolioResponse(BaseModel):
    id: UUID
    media_url: str
    media_type: str
    title: str | None = None
    description: str | None = None

    class Config:
        from_attributes = True


class PricingResponse(BaseModel):
    id: UUID
    pricing_type: str
    amount: float
    currency: str

    unit: str | None = None
    min_quantity: float | None = None
    max_quantity: float | None = None

    occupancy_per_room: int | None = None

    total_rooms: int | None = None

    class Config:
        from_attributes = True


class ServiceResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None

    category_id: UUID | None = None

    starting_price: float | None = None

    pricing: list[PricingResponse]


class ProviderResponse(BaseModel):
    id: UUID

    business_name: str
    owner_name: str

    email: str
    phone: str

    state_id: int | None
    district_id: int | None
    location_id: int | None

    verification_status: str

    description: str | None

    # Provider-set booking notice (hours) + free-text cancellation
    # policy, shown to the customer on this profile before they book
    # (see BookingPolicyUpdate in schemas/provider.py for how the
    # provider sets these).
    booking_notice_hours: int = 6
    cancellation_policy: str | None = None

    address: str | None

    # Dedicated profile/cover photo, shown as the background behind
    # the business name at the top of this page - falls back to
    # cover_image_url, then logo_url (both set during the
    # registration wizard's "Business Photos & Video" step - see
    # handleMediaUpload in ProviderRegistrationWizard.tsx, which never
    # touches display_picture_url), then the first portfolio image,
    # then a colored icon tile, on the frontend when all of these are
    # None.
    display_picture_url: str | None = None
    cover_image_url: str | None = None
    logo_url: str | None = None

    class Config:
        from_attributes = True


class ProviderDetailsResponse(BaseModel):
    provider: ProviderResponse

    portfolio: list[PortfolioResponse]

    services: list[ServiceResponse]

    starting_price: float | None

    rating: float = 0

    review_count: int = 0