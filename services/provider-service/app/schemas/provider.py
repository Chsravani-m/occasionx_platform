

from uuid import UUID
from pydantic import BaseModel, EmailStr
from datetime import datetime

from pydantic import BaseModel
from typing import Literal
from typing import Optional

from app.schemas.provider_document import (
    ProviderDocumentResponse
)

class ProviderCreate(BaseModel):
    user_id: UUID
    business_name: str
    owner_name: str
    email: EmailStr
    phone: str

    # Business Location (Tab 3) and Services (Tab 4) now come after
    # account creation in the 7-tab wizard, so these are no longer
    # required at creation time - they get filled in via the dedicated
    # per-tab PATCH endpoints below (LocationUpdate/ServicesUpdate)
    # once the provider reaches those tabs.
    state_id: int | None = None
    district_id: int | None = None
    location_id: int | None = None
    category_id: UUID | None = None
    subcategory_id: UUID | None = None
    address: str | None = None
    gst_number: str | None = None
    description: str | None = None

    # --- Tab 1: Business Information ---
    legal_entity_name: str | None = None
    pan_number: str | None = None
    year_established: int | None = None
    business_registration_number: str | None = None
    entity_type: str | None = None
    logo_url: str | None = None
    cover_image_url: str | None = None
    promotional_video_url: str | None = None

    # --- Tab 2: Contact Details ---
    contact_person: str | None = None
    whatsapp_number: str | None = None
    website_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    youtube_url: str | None = None


class ProviderResponse(BaseModel):
    id: UUID
    user_id: UUID

    business_name: str
    owner_name: str

    email: str
    phone: str

    state_id: int | None = None
    district_id: int | None = None
    location_id: int | None = None

    state_name: str | None = None
    district_name: str | None = None
    location_name: str | None = None

    verification_status: str

    registration_fee_paid: bool = False

    account_activated: bool = False

    # Provider-set booking notice (hours) + free-text cancellation
    # policy - see BookingPolicyUpdate/Response below for the
    # dedicated endpoint providers use to manage these.
    booking_notice_hours: int = 6
    cancellation_policy: str | None = None

    # Dedicated profile/cover photo (see the display-picture upload
    # endpoint in api/provider.py) - None until the provider sets one.
    display_picture_url: str | None = None

    # Registration wizard fields (see LocationResponse / ServicesTabResponse
    # / PricingTabResponse / AvailabilityTabResponse / KycResponse above
    # for the JSON-list-decoded versions of the same data on their
    # dedicated per-tab endpoints) - included here too so a single
    # GET /providers/{id} call can hydrate every tab when a provider
    # resumes an in-progress registration.
    gst_number: str | None = None
    address: str | None = None
    description: str | None = None

    legal_entity_name: str | None = None
    pan_number: str | None = None
    year_established: int | None = None
    business_registration_number: str | None = None
    entity_type: str | None = None
    logo_url: str | None = None
    cover_image_url: str | None = None
    promotional_video_url: str | None = None

    contact_person: str | None = None
    whatsapp_number: str | None = None
    website_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    youtube_url: str | None = None

    country: str | None = None
    area: str | None = None
    postal_code: str | None = None
    google_map_url: str | None = None
    service_radius_km: int | None = None

    years_of_experience: int | None = None
    team_size: int | None = None

    starting_price: float | None = None
    price_range_min: float | None = None
    price_range_max: float | None = None
    custom_quotation_available: bool = False
    advance_percentage: int | None = None

    instant_booking: bool = False
    calendar_integration_enabled: bool = False

    aadhaar_number: str | None = None
    cancelled_cheque_url: str | None = None

    class Config:
        from_attributes = True

class ProviderUpdate(BaseModel):
    business_name: str | None = None
    owner_name: str | None = None
    phone: str | None = None
    state_id: int | None = None

    district_id: int | None = None

    location_id: int | None = None
    address: str | None = None
    description: str | None = None

    # Registration wizard tabs also collected here so a provider can
    # come back and edit any field from their dashboard later, not
    # just during the initial wizard.
    legal_entity_name: str | None = None
    pan_number: str | None = None
    year_established: int | None = None
    business_registration_number: str | None = None
    entity_type: str | None = None
    gst_number: str | None = None
    contact_person: str | None = None
    whatsapp_number: str | None = None
    website_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    youtube_url: str | None = None


class LocationUpdate(BaseModel):
    """Tab 3: Business Location."""

    country: str | None = None
    state_id: int | None = None
    district_id: int | None = None
    location_id: int | None = None
    area: str | None = None
    postal_code: str | None = None
    address: str | None = None
    google_map_url: str | None = None
    service_radius_km: int | None = None
    # List of branch objects, e.g. [{"address": "...", "city": "..."}]
    branches: list[dict] | None = None


class LocationResponse(BaseModel):
    country: str | None = None
    state_id: int | None = None
    district_id: int | None = None
    location_id: int | None = None
    area: str | None = None
    postal_code: str | None = None
    address: str | None = None
    google_map_url: str | None = None
    service_radius_km: int | None = None
    branches: list[dict] = []

    class Config:
        from_attributes = True


class ServicesTabUpdate(BaseModel):
    """
    Tab 4: Services. Primary/Sub category are assigned via the
    existing /providers/{id}/categories endpoint (see
    schemas/provider_category.py) rather than here - "Additional
    Services" reuses that same mechanism as extra category rows.
    """

    languages_spoken: list[str] | None = None
    years_of_experience: int | None = None
    team_size: int | None = None


class ServicesTabResponse(BaseModel):
    languages_spoken: list[str] = []
    years_of_experience: int | None = None
    team_size: int | None = None

    class Config:
        from_attributes = True


class PricingTabUpdate(BaseModel):
    """Tab 5: Pricing."""

    starting_price: float | None = None
    price_range_min: float | None = None
    price_range_max: float | None = None
    custom_quotation_available: bool | None = None
    advance_percentage: int | None = None
    payment_modes: list[str] | None = None
    cancellation_policy: str | None = None


class PricingTabResponse(BaseModel):
    starting_price: float | None = None
    price_range_min: float | None = None
    price_range_max: float | None = None
    custom_quotation_available: bool = False
    advance_percentage: int | None = None
    payment_modes: list[str] = []
    cancellation_policy: str | None = None

    class Config:
        from_attributes = True


class AvailabilityTabUpdate(BaseModel):
    """Tab 6: Availability."""

    # Dict keyed by weekday, e.g. {"mon": {"open": "09:00", "close": "18:00"}}
    business_hours: dict | None = None
    weekly_off: list[str] | None = None
    holidays: list[str] | None = None
    instant_booking: bool | None = None
    calendar_integration_enabled: bool | None = None


class AvailabilityTabResponse(BaseModel):
    business_hours: dict = {}
    weekly_off: list[str] = []
    holidays: list[str] = []
    instant_booking: bool = False
    calendar_integration_enabled: bool = False

    class Config:
        from_attributes = True


class KycUpdate(BaseModel):
    """
    Tab 7: KYC. Aadhaar/PAN/GST numbers plus the cancelled cheque
    image; the actual Aadhaar/PAN/GST/License/Certification document
    images go through the existing
    POST /providers/{id}/documents/upload endpoint (document_type
    AADHAAR/PAN_CARD/GST_CERTIFICATE/BUSINESS_LICENSE/CERTIFICATION),
    and Portfolio work samples through POST /providers/{id}/portfolio.
    """

    aadhaar_number: str | None = None
    pan_number: str | None = None
    gst_number: str | None = None
    cancelled_cheque_url: str | None = None


class KycResponse(BaseModel):
    aadhaar_number: str | None = None
    pan_number: str | None = None
    gst_number: str | None = None
    cancelled_cheque_url: str | None = None

    class Config:
        from_attributes = True

class ProviderVerificationUpdate(BaseModel):
    verification_status: str


class ProviderVerificationRequest(BaseModel):
    verification_status: Literal[
        "VERIFIED",
        "REJECTED"
    ]
    rejection_reason: Optional[str] = None

class ActivateAccountRequest(BaseModel):
    token: str


class ActivateAccountResponse(BaseModel):
    success: bool
    business_name: str | None = None
    email: str | None = None


class ProviderStatsResponse(BaseModel):
    total: int
    pending: int
    verified: int
    rejected: int

class ProviderVerificationDetailsResponse(
    BaseModel
):
    provider: ProviderResponse

    documents: list[
        ProviderDocumentResponse
    ]

class ProviderDashboardResponse(
    BaseModel
):
    provider_id: UUID
    business_name: str
    verification_status: str
    owner_name: str
    email: str
    phone: str

    documents_uploaded: int
    services_count: int
    portfolio_count: int
    categories_count: int

    pricing_completed: bool

    registration_fee_paid: bool
    registration_paid_at: datetime | None = None

    account_activated: bool = False

    onboarding_completed: bool

    profile_views: int = 0
    average_rating: float = 0
    total_reviews: int = 0

    display_picture_url: str | None = None
    cover_image_url: str | None = None


class RatingSubmission(BaseModel):
    # 1-5 - validated again here even though booking-service already
    # validates it, since this endpoint could in principle be called
    # by anything else internally later.
    rating: int


class RatingUpdateResponse(BaseModel):
    average_rating: float
    total_reviews: int


class BankDetailsUpdate(BaseModel):
    bank_account_holder_name: str
    bank_account_number: str
    bank_ifsc_code: str
    bank_name: str


class BankDetailsResponse(BaseModel):
    bank_account_holder_name: str | None = None
    bank_account_number: str | None = None
    bank_ifsc_code: str | None = None
    bank_name: str | None = None

    # True once Razorpay Route is actually wired up for this provider
    # (see RazorpayAccountSetupRequest below) - until then, bank
    # details are just stored for manual settlement.
    payout_automated: bool = False

    class Config:
        from_attributes = True


class BookingPolicyUpdate(BaseModel):
    # How many hours before the event a customer must book by - the
    # provider's own replacement for the old platform-wide category-tier
    # day-based rule. E.g. 6 means a 12:00pm event can be booked from
    # 6:00am the same day.
    booking_notice_hours: int
    # Free-text cancellation policy shown to the customer before they
    # book, like a short terms-and-conditions clause - purely
    # informational, not parsed/enforced by the system.
    cancellation_policy: str | None = None


class BookingPolicyResponse(BaseModel):
    booking_notice_hours: int = 6
    cancellation_policy: str | None = None

    class Config:
        from_attributes = True


class RazorpayAccountSetupRequest(BaseModel):
    """
    Everything Razorpay's Route "Create a Linked Account" API needs
    beyond what's already on the Provider record (name/email/phone) -
    submitted from the provider's bank-details page to actually create
    (or update) their Razorpay linked account, instead of leaving
    razorpay_linked_account_id permanently NULL.
    """

    pan_number: str
    # Razorpay's business_type enum, e.g. "individual",
    # "proprietorship", "partnership", "private_limited", etc.
    business_type: str
    # Razorpay's profile.category / profile.subcategory enums, e.g.
    # category "services", subcategory "event_management".
    business_category: str
    business_subcategory: str

    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    postal_code: str

    # Optional here since bank details may already have been saved via
    # the separate bank-details form above - if given, these overwrite
    # whatever's currently stored (e.g. the provider is fixing a typo).
    bank_account_holder_name: str | None = None
    bank_account_number: str | None = None
    bank_ifsc_code: str | None = None
    bank_name: str | None = None


class RazorpayAccountStatusResponse(BaseModel):
    razorpay_linked_account_id: str | None = None
    # Razorpay's activation_status for the Route product config, e.g.
    # requested / needs_clarification / under_review / activated /
    # suspended. None until setup has been attempted at least once.
    razorpay_account_status: str | None = None
    # Outstanding KYC items Razorpay still needs (e.g. proof of
    # identity/address) - usually means the provider has to complete a
    # manual step with Razorpay directly, since document upload isn't
    # automated here.
    razorpay_account_requirements: list[str] = []
    # Raw message from the most recent failed setup attempt, if any.
    razorpay_account_error: str | None = None

    class Config:
        from_attributes = True