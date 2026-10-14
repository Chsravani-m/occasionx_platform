import uuid

from sqlalchemy import Column, Numeric, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base
from sqlalchemy import Integer
from sqlalchemy import Boolean


class Provider(Base):
    __tablename__ = "providers"

    id = Column(UUID(as_uuid=True),
                primary_key=True,
                default=uuid.uuid4)

    # Powers the customer app's Browse screen "Recently Added"
    # default view (see get_recently_added_providers in
    # crud/provider_category.py) - existing rows get backfilled to
    # "now" by the migration below since there's no real signup time
    # to recover for them.
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    user_id = Column(UUID(as_uuid=True),
                        nullable=False)

    business_name = Column(String(255))
    owner_name = Column(String(255))

    # A dedicated profile/cover photo the provider sets themselves,
    # distinct from portfolio media - shown as the background behind
    # the business name on provider cards and the details page in the
    # customer app. Falls back to the first portfolio image, then a
    # colored icon tile, when this is unset (see get_providers_for_category
    # in crud/provider_category.py and search.py for the fallback chain).
    display_picture_url = Column(String(500), nullable=True)

    email = Column(String(255))
    phone = Column(String(20))
    state_id = Column(
    Integer,
    nullable=True
    )

    district_id = Column(
        Integer,
        nullable=True
    )

    location_id = Column(
        Integer,
        nullable=True
    )
    
    address = Column(Text)

    gst_number = Column(String(100))

    description = Column(Text)

    verification_status = Column(
        String(50),
        default="PENDING"
    )

    verified_at = Column(
    DateTime,
    nullable=True
    )

    rejection_reason = Column(
        Text,
        nullable=True
    )
    registration_fee_paid = Column(
        Boolean,
        default=False
    )

    registration_fee_amount = Column(
        Numeric(10, 2),
        default=999
    )

    registration_paid_at = Column(
    DateTime,
    nullable=True
    )

    # Razorpay order created for this provider's registration fee. The
    # payment confirmation is only accepted for this exact order.
    registration_order_id = Column(
        String(100),
        nullable=True
    )

    account_activated = Column(
        Boolean,
        default=False
    )

    activation_token = Column(
        String(255),
        nullable=True
    )

    activated_at = Column(
        DateTime,
        nullable=True
    )

    onboarding_completed = Column(
    Boolean,
    default=False
    )

    average_rating = Column(
    Numeric(3, 2),
    default=0
    )

    total_reviews = Column(
        Integer,
        default=0
    )

    total_bookings = Column(
        Integer,
        default=0
    )

    profile_views = Column(
        Integer,
        default=0
    )

    # Bank details the provider adds from their dashboard so the
    # service-fee portion of each booking (everything except the
    # platform's own application fee) can eventually be paid out to
    # them directly. Plain data fields for now - see
    # razorpay_linked_account_id below for what's needed to actually
    # route money automatically via Razorpay.
    bank_account_holder_name = Column(
        String(255),
        nullable=True
    )

    bank_account_number = Column(
        String(50),
        nullable=True
    )

    bank_ifsc_code = Column(
        String(20),
        nullable=True
    )

    bank_name = Column(
        String(255),
        nullable=True
    )

    # Razorpay Route "linked account" id (acc_xxx). NULL until the
    # provider has completed the automatic-payout setup below (see
    # crud/razorpay_account.py) - while this is NULL, booking payments
    # keep landing in the company's Razorpay account as they do today
    # (to be settled to the provider manually using the bank details
    # above). Once set, booking-service includes it as a Razorpay
    # Route transfer on the payment order so the service-fee amount is
    # split straight to the provider's own account automatically.
    razorpay_linked_account_id = Column(
        String(100),
        nullable=True
    )

    # The KYC/business fields Razorpay's "Create a Linked Account" API
    # requires, beyond what's already collected above - collected on
    # the provider's bank-details page and sent to Razorpay by
    # crud/razorpay_account.py. business_type/category/subcategory use
    # Razorpay's own enum values (see their Route integration guide).
    pan_number = Column(String(20), nullable=True)
    business_type = Column(String(50), nullable=True)
    business_category = Column(String(100), nullable=True)
    business_subcategory = Column(String(100), nullable=True)

    razorpay_address_line1 = Column(String(255), nullable=True)
    razorpay_address_line2 = Column(String(255), nullable=True)
    razorpay_city = Column(String(100), nullable=True)
    razorpay_state = Column(String(100), nullable=True)
    razorpay_postal_code = Column(String(20), nullable=True)

    # acc_prd_xxx - the Route "product configuration" requested for
    # the linked account above (step 2 of onboarding).
    razorpay_product_id = Column(String(100), nullable=True)

    # Razorpay's activation_status for the Route product config, e.g.
    # requested / needs_clarification / under_review / activated /
    # suspended - shown to the provider so they know whether payouts
    # are actually live yet or still pending Razorpay's own KYC
    # review.
    razorpay_account_status = Column(String(50), nullable=True)

    # JSON-encoded list of outstanding KYC items Razorpay says are
    # still needed (e.g. proof of identity/address) - populated from
    # the "requirements" array Razorpay returns, since full document
    # upload isn't automated here and providers may need to complete
    # that step with Razorpay directly.
    razorpay_account_requirements = Column(Text, nullable=True)

    # Raw error message from the most recent failed onboarding call to
    # Razorpay, if any - surfaced as-is so a failure is diagnosable
    # without needing to reproduce it (this app's sandbox can't make
    # live calls to Razorpay to test this ahead of time).
    razorpay_account_error = Column(Text, nullable=True)

    # Provider-set booking notice + cancellation policy, shown to
    # customers on the provider's profile and enforced by
    # booking-service at booking-creation time (see
    # booking-service/app/core/booking_rules.py). Replaces the old
    # platform-wide category-tier day-based rule - each provider now
    # states their own minimum notice in hours (e.g. a caterer might
    # need 6 hours' notice for a same-day event; a photographer might
    # only need 4). Defaults to 6 hours until the provider customizes
    # it from their dashboard/app.
    booking_notice_hours = Column(
        Integer,
        nullable=False,
        default=6,
        server_default="6",
    )

    # Free-text cancellation policy, written by the provider like a
    # short terms-and-conditions clause (e.g. "Cancellations allowed up
    # to 24 hours before the event; no refund after."). Purely
    # informational - shown to the customer before they book - not
    # parsed/enforced by the system.
    cancellation_policy = Column(Text, nullable=True)

    # ------------------------------------------------------------------
    # 7-tab registration wizard fields, added below. Grouped by the tab
    # they're collected on. List-type fields follow the codebase's
    # existing convention (see razorpay_account_requirements above) of
    # JSON-encoded Text columns rather than a JSON column type.
    # ------------------------------------------------------------------

    # --- Tab 1: Business Information ---
    legal_entity_name = Column(String(255), nullable=True)
    business_registration_number = Column(String(100), nullable=True)
    year_established = Column(Integer, nullable=True)

    # Business Type as selected in Tab 1 (Individual/Partnership/LLP/
    # Pvt Ltd/NGO/Others) - kept separate from the existing
    # `business_type` column above, which stores Razorpay's own Route
    # enum values for a different purpose (automatic payouts KYC).
    entity_type = Column(String(50), nullable=True)

    logo_url = Column(String(500), nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    promotional_video_url = Column(String(500), nullable=True)

    # --- Tab 2: Contact Details ---
    contact_person = Column(String(255), nullable=True)
    whatsapp_number = Column(String(20), nullable=True)
    website_url = Column(String(500), nullable=True)
    facebook_url = Column(String(500), nullable=True)
    instagram_url = Column(String(500), nullable=True)
    youtube_url = Column(String(500), nullable=True)

    # --- Tab 3: Business Location ---
    country = Column(String(100), nullable=True, default="India")
    area = Column(String(255), nullable=True)
    postal_code = Column(String(20), nullable=True)
    google_map_url = Column(String(500), nullable=True)
    service_radius_km = Column(Integer, nullable=True)

    # JSON-encoded list of branch objects, e.g.
    # [{"address": "...", "city": "...", "state": "..."}]
    branches = Column(Text, nullable=True)

    # --- Tab 4: Services ---
    # JSON-encoded list of strings, e.g. ["English", "Hindi", "Telugu"]
    languages_spoken = Column(Text, nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    team_size = Column(Integer, nullable=True)

    # --- Tab 5: Pricing ---
    starting_price = Column(Numeric(10, 2), nullable=True)
    price_range_min = Column(Numeric(10, 2), nullable=True)
    price_range_max = Column(Numeric(10, 2), nullable=True)
    custom_quotation_available = Column(Boolean, default=False)
    advance_percentage = Column(Integer, nullable=True)

    # JSON-encoded list of strings, e.g. ["UPI", "Card", "Cash", "Bank Transfer"]
    payment_modes = Column(Text, nullable=True)

    # --- Tab 6: Availability ---
    # JSON-encoded dict keyed by weekday, e.g.
    # {"mon": {"open": "09:00", "close": "18:00"}, ...}
    business_hours = Column(Text, nullable=True)

    # JSON-encoded list of weekday strings, e.g. ["sun"]
    weekly_off = Column(Text, nullable=True)

    # JSON-encoded list of ISO date strings the provider is closed on.
    holidays = Column(Text, nullable=True)

    instant_booking = Column(Boolean, default=False)
    calendar_integration_enabled = Column(Boolean, default=False)

    # --- Tab 7: KYC ---
    # Aadhaar/PAN/GST numbers as text fields; the actual document
    # images for Aadhaar, PAN, GST, Business License, Portfolio,
    # Certifications and Cancelled Cheque are uploaded as
    # ProviderDocument rows (see provider_document.py) keyed by
    # document_type, matching the existing pattern for those doc types
    # already in the system.
    aadhaar_number = Column(String(20), nullable=True)

    # Cancelled cheque image URL, stored directly here alongside the
    # rest of the bank details fields (mirrors how a ProviderDocument
    # row of type CANCELLED_CHEQUE would work, but this is quicker to
    # read back on the bank-details screen without a join).
    cancelled_cheque_url = Column(String(500), nullable=True)