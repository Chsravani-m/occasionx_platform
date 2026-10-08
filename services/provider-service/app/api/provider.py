from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.dependencies import get_db
from uuid import UUID
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi import File
from sqlalchemy import func
import os
import secrets
import uuid
import razorpay
from datetime import datetime

from app.db.models.provider import Provider
from app.db.models.service import Service
from app.db.models.pricing import Pricing
from app.db.models.portfolio import Portfolio

from app.schemas.provider import (
    ProviderCreate,
    ProviderResponse,
    ProviderUpdate,
    ProviderStatsResponse,
    ProviderVerificationDetailsResponse,
    ProviderDashboardResponse,
    ActivateAccountRequest,
    ActivateAccountResponse,
    RatingSubmission,
    RatingUpdateResponse,
    BankDetailsUpdate,
    BankDetailsResponse,
    BookingPolicyUpdate,
    BookingPolicyResponse,
    RazorpayAccountSetupRequest,
    RazorpayAccountStatusResponse,
    LocationUpdate,
    LocationResponse,
    ServicesTabUpdate,
    ServicesTabResponse,
    PricingTabUpdate,
    PricingTabResponse,
    AvailabilityTabUpdate,
    AvailabilityTabResponse,
    KycUpdate,
    KycResponse,

)
from app.schemas.provider_details import (
    ProviderDetailsResponse
)
from app.schemas.payment import (
    RegistrationPaymentResponse,
    PaymentVerificationRequest
)
from app.utils.pricing import effective_starting_price
from app.email_utils import send_activation_email, build_activation_link

from app.crud.provider import (
    create_provider,
    get_provider_by_id,
    update_provider,
    get_all_providers,
    get_provider_stats,
    get_verified_providers,
    get_provider_verification_details,
    get_provider_by_user_id,
    get_provider_dashboard,
    generate_activation_token,
    activate_provider_account,
    add_provider_rating,
    update_provider_location,
    get_provider_location,
    update_provider_services_tab,
    get_provider_services_tab,
    update_provider_pricing_tab,
    get_provider_pricing_tab,
    update_provider_availability_tab,
    get_provider_availability_tab,
    update_provider_kyc,

)
from app.crud.provider_category import (
    get_recently_added_providers
)
from app.crud.razorpay_account import (
    setup_linked_account,
    RazorpayAccountError
)
import json

router = APIRouter(
    prefix="/providers",
    tags=["Providers"]
)

@router.get(
    "/",
    response_model=list[ProviderResponse]
)
def list_providers(
    db: Session = Depends(get_db)
):
    return get_all_providers(db)

@router.post(
    "",
    response_model=ProviderResponse
)
def register_provider(
    provider: ProviderCreate,
    db: Session = Depends(get_db)
):
    return create_provider(
        db,
        provider
    )

@router.get(
    "/stats",
    response_model=ProviderStatsResponse
)
def provider_stats(
    db: Session = Depends(get_db)
):
    return get_provider_stats(db)

@router.get(
    "/verified",
    response_model=list[ProviderResponse]
)
def list_verified_providers(
    db: Session = Depends(get_db)
):
    return get_verified_providers(db)

@router.get(
    "/{provider_id}/verification-details",
    response_model=
    ProviderVerificationDetailsResponse
)
def provider_verification_details(
    provider_id: UUID,
    db: Session = Depends(get_db)
):

    result = (
        get_provider_verification_details(
            db,
            provider_id
        )
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return result

@router.get(
    "/dashboard/{provider_id}",
    response_model=ProviderDashboardResponse
)
def provider_dashboard(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    dashboard = get_provider_dashboard(
        db,
        provider_id
    )

    if not dashboard:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return dashboard

@router.get(
    "/recent"
)
def get_recent_providers_api(
    state_id: int | None = None,
    district_id: int | None = None,
    location_id: int | None = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    The newest verified providers across every category - powers the
    customer app's Browse screen default view (see
    get_recently_added_providers in crud/provider_category.py).
    Deliberately defined ahead of GET /{provider_id} below: both are
    2-segment paths ("/providers/recent" vs "/providers/{provider_id}"),
    and FastAPI/Starlette match routes in registration order, so this
    one would otherwise get shadowed by the generic provider_id lookup
    and fail UUID validation on "recent".
    """

    return get_recently_added_providers(
        db,
        state_id,
        district_id,
        location_id,
        limit
    )

@router.get(
    "/{provider_id}",
    response_model=ProviderResponse
)
def get_provider(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    provider = get_provider_by_id(
        db,
        provider_id
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return provider

@router.put(
    "/{provider_id}",
    response_model=ProviderResponse
)
def update_provider_api(
    provider_id: UUID,
    provider_data: ProviderUpdate,
    db: Session = Depends(get_db)
):
    provider = update_provider(
        db,
        provider_id,
        provider_data
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return provider


DISPLAY_PICTURE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
]

MAX_DISPLAY_PICTURE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/{provider_id}/display-picture"
)
async def upload_display_picture(
    provider_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    A dedicated profile/cover photo the provider sets themselves,
    distinct from portfolio media - shown as the background behind
    the business name on provider cards and the details page in the
    customer app (see get_providers_for_category in
    crud/provider_category.py and search.py for the fallback chain to
    the first portfolio image, then a colored icon tile, when this is
    unset).
    """

    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    contents = await file.read()

    if file.content_type not in DISPLAY_PICTURE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    if len(contents) > MAX_DISPLAY_PICTURE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image exceeds 10 MB"
        )

    os.makedirs("uploads/providers/display", exist_ok=True)

    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = f"uploads/providers/display/{filename}"

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    provider.display_picture_url = f"/uploads/providers/display/{filename}"

    db.commit()
    db.refresh(provider)

    return {
        "display_picture_url": provider.display_picture_url
    }


MAX_LOGO_SIZE = 5 * 1024 * 1024        # 5 MB
MAX_COVER_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_PROMO_VIDEO_SIZE = 100 * 1024 * 1024  # 100 MB

PROMO_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
]


@router.post("/{provider_id}/logo")
async def upload_logo(
    provider_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Tab 1 (Business Information) - Logo Upload."""

    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    contents = await file.read()

    if file.content_type not in DISPLAY_PICTURE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    if len(contents) > MAX_LOGO_SIZE:
        raise HTTPException(status_code=400, detail="Logo exceeds 5 MB")

    os.makedirs("uploads/providers/logo", exist_ok=True)

    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = f"uploads/providers/logo/{filename}"

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    provider.logo_url = f"/uploads/providers/logo/{filename}"

    db.commit()
    db.refresh(provider)

    return {"logo_url": provider.logo_url}


@router.post("/{provider_id}/cover-image")
async def upload_cover_image(
    provider_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Tab 1 (Business Information) - Cover Image."""

    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    contents = await file.read()

    if file.content_type not in DISPLAY_PICTURE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    if len(contents) > MAX_COVER_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Cover image exceeds 10 MB")

    os.makedirs("uploads/providers/cover", exist_ok=True)

    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = f"uploads/providers/cover/{filename}"

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    provider.cover_image_url = f"/uploads/providers/cover/{filename}"

    db.commit()
    db.refresh(provider)

    return {"cover_image_url": provider.cover_image_url}


@router.post("/{provider_id}/promotional-video")
async def upload_promotional_video(
    provider_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Tab 1 (Business Information) - Promotional Video."""

    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    contents = await file.read()

    if file.content_type not in PROMO_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only MP4, WEBM and MOV videos are allowed"
        )

    if len(contents) > MAX_PROMO_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="Video exceeds 100 MB")

    os.makedirs("uploads/providers/promo-video", exist_ok=True)

    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = f"uploads/providers/promo-video/{filename}"

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    provider.promotional_video_url = f"/uploads/providers/promo-video/{filename}"

    db.commit()
    db.refresh(provider)

    return {"promotional_video_url": provider.promotional_video_url}


@router.post(
    "/{provider_id}/rating",
    response_model=RatingUpdateResponse
)
def submit_provider_rating_api(
    provider_id: UUID,
    payload: RatingSubmission,
    db: Session = Depends(get_db)
):
    """
    Internal endpoint called by booking-service whenever a customer
    submits a review - folds the new rating into this provider's
    running average_rating/total_reviews.
    """

    provider = add_provider_rating(
        db,
        provider_id,
        payload.rating
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return RatingUpdateResponse(
        average_rating=provider.average_rating,
        total_reviews=provider.total_reviews
    )


@router.get(
    "/{provider_id}/linked-account-id"
)
def get_linked_account_id_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Internal endpoint called by booking-service when creating a
    booking's payment order, to decide whether the service-fee amount
    can be routed straight to the provider via Razorpay Route
    (transfers). Deliberately only exposes the linked-account id, not
    the raw bank details.
    """

    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return {
        "razorpay_linked_account_id":
            provider.razorpay_linked_account_id
    }


@router.get(
    "/{provider_id}/bank-details",
    response_model=BankDetailsResponse
)
def get_bank_details_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return BankDetailsResponse(
        bank_account_holder_name=provider.bank_account_holder_name,
        bank_account_number=provider.bank_account_number,
        bank_ifsc_code=provider.bank_ifsc_code,
        bank_name=provider.bank_name,
        payout_automated=bool(provider.razorpay_linked_account_id),
    )


@router.put(
    "/{provider_id}/bank-details",
    response_model=BankDetailsResponse
)
def update_bank_details_api(
    provider_id: UUID,
    payload: BankDetailsUpdate,
    db: Session = Depends(get_db)
):
    provider = update_provider(db, provider_id, payload)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return BankDetailsResponse(
        bank_account_holder_name=provider.bank_account_holder_name,
        bank_account_number=provider.bank_account_number,
        bank_ifsc_code=provider.bank_ifsc_code,
        bank_name=provider.bank_name,
        payout_automated=bool(provider.razorpay_linked_account_id),
    )


@router.get(
    "/{provider_id}/location",
    response_model=LocationResponse
)
def get_location_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    location = get_provider_location(db, provider_id)

    if location is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return location


@router.put(
    "/{provider_id}/location",
    response_model=LocationResponse
)
def update_location_api(
    provider_id: UUID,
    payload: LocationUpdate,
    db: Session = Depends(get_db)
):
    location = update_provider_location(db, provider_id, payload)

    if location is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return location


@router.get(
    "/{provider_id}/services-tab",
    response_model=ServicesTabResponse
)
def get_services_tab_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    result = get_provider_services_tab(db, provider_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return result


@router.put(
    "/{provider_id}/services-tab",
    response_model=ServicesTabResponse
)
def update_services_tab_api(
    provider_id: UUID,
    payload: ServicesTabUpdate,
    db: Session = Depends(get_db)
):
    result = update_provider_services_tab(db, provider_id, payload)

    if result is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return result


@router.get(
    "/{provider_id}/pricing-tab",
    response_model=PricingTabResponse
)
def get_pricing_tab_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    result = get_provider_pricing_tab(db, provider_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return result


@router.put(
    "/{provider_id}/pricing-tab",
    response_model=PricingTabResponse
)
def update_pricing_tab_api(
    provider_id: UUID,
    payload: PricingTabUpdate,
    db: Session = Depends(get_db)
):
    result = update_provider_pricing_tab(db, provider_id, payload)

    if result is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return result


@router.get(
    "/{provider_id}/availability-tab",
    response_model=AvailabilityTabResponse
)
def get_availability_tab_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    result = get_provider_availability_tab(db, provider_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return result


@router.put(
    "/{provider_id}/availability-tab",
    response_model=AvailabilityTabResponse
)
def update_availability_tab_api(
    provider_id: UUID,
    payload: AvailabilityTabUpdate,
    db: Session = Depends(get_db)
):
    result = update_provider_availability_tab(db, provider_id, payload)

    if result is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return result


@router.put(
    "/{provider_id}/kyc",
    response_model=KycResponse
)
def update_kyc_api(
    provider_id: UUID,
    payload: KycUpdate,
    db: Session = Depends(get_db)
):
    result = update_provider_kyc(db, provider_id, payload)

    if result is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    return result


@router.get(
    "/{provider_id}/booking-policy",
    response_model=BookingPolicyResponse
)
def get_booking_policy_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Public - used both by the provider's own settings page and by the
    customer-facing provider profile (though ProviderDetailsResponse
    already inlines these two fields for the profile; this endpoint is
    mainly for the provider's own dashboard/app to read back what's
    currently saved before editing it).
    """

    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return BookingPolicyResponse(
        booking_notice_hours=provider.booking_notice_hours,
        cancellation_policy=provider.cancellation_policy,
    )


@router.put(
    "/{provider_id}/booking-policy",
    response_model=BookingPolicyResponse
)
def update_booking_policy_api(
    provider_id: UUID,
    payload: BookingPolicyUpdate,
    db: Session = Depends(get_db)
):
    if payload.booking_notice_hours < 0:
        raise HTTPException(
            status_code=400,
            detail="Booking notice hours can't be negative."
        )

    provider = update_provider(db, provider_id, payload)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return BookingPolicyResponse(
        booking_notice_hours=provider.booking_notice_hours,
        cancellation_policy=provider.cancellation_policy,
    )


def _razorpay_account_status_response(
    provider: Provider
) -> RazorpayAccountStatusResponse:
    requirements = (
        json.loads(provider.razorpay_account_requirements)
        if provider.razorpay_account_requirements
        else []
    )

    return RazorpayAccountStatusResponse(
        razorpay_linked_account_id=provider.razorpay_linked_account_id,
        razorpay_account_status=provider.razorpay_account_status,
        razorpay_account_requirements=requirements,
        razorpay_account_error=provider.razorpay_account_error,
    )


@router.get(
    "/{provider_id}/razorpay-account",
    response_model=RazorpayAccountStatusResponse
)
def get_razorpay_account_status_api(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return _razorpay_account_status_response(provider)


@router.post(
    "/{provider_id}/razorpay-account",
    response_model=RazorpayAccountStatusResponse
)
def setup_razorpay_account_api(
    provider_id: UUID,
    payload: RazorpayAccountSetupRequest,
    db: Session = Depends(get_db)
):
    """
    Kicks off (or resumes) Razorpay's Route linked-account onboarding
    for this provider, so booking-service can start splitting payments
    straight to them via Route transfers instead of everything landing
    in OccasionX's own account. Persists the submitted KYC/business
    fields first so a retry after a failure doesn't need them
    re-entered, then calls Razorpay live - see
    crud/razorpay_account.py for the full 3-step flow.
    """

    provider = get_provider_by_id(db, provider_id)

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    provider.pan_number = payload.pan_number
    provider.business_type = payload.business_type
    provider.business_category = payload.business_category
    provider.business_subcategory = payload.business_subcategory
    provider.razorpay_address_line1 = payload.address_line1
    provider.razorpay_address_line2 = payload.address_line2
    provider.razorpay_city = payload.city
    provider.razorpay_state = payload.state
    provider.razorpay_postal_code = payload.postal_code

    if payload.bank_account_holder_name:
        provider.bank_account_holder_name = payload.bank_account_holder_name
    if payload.bank_account_number:
        provider.bank_account_number = payload.bank_account_number
    if payload.bank_ifsc_code:
        provider.bank_ifsc_code = payload.bank_ifsc_code
    if payload.bank_name:
        provider.bank_name = payload.bank_name

    db.commit()
    db.refresh(provider)

    if (
        not provider.bank_account_number
        or not provider.bank_ifsc_code
        or not provider.bank_account_holder_name
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Bank details (account holder name, account number, "
                "IFSC code) are required before automatic payouts can "
                "be set up."
            )
        )

    try:
        provider = setup_linked_account(db, provider)
    except RazorpayAccountError as exc:
        # Not a 500 - this is Razorpay itself rejecting the request
        # (e.g. an invalid PAN format or unsupported category), a
        # normal/expected outcome the provider or admin needs to see
        # and correct, not a bug. The message is Razorpay's own.
        raise HTTPException(
            status_code=422,
            detail=f"Razorpay couldn't complete this step: {exc}"
        )

    return _razorpay_account_status_response(provider)


@router.get(
    "/user/{user_id}",
    response_model=ProviderResponse
)
def get_provider_by_user_id_api(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    provider = get_provider_by_user_id(
        db,
        user_id
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    return provider

@router.get(
    "/{provider_id}/details",
    response_model=ProviderDetailsResponse,
)
def get_provider_details(
    provider_id: UUID,
    db: Session = Depends(get_db),
):

    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    provider.profile_views = (
        (provider.profile_views or 0) + 1
    )

    db.commit()

    db.refresh(provider)

    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.provider_id == provider_id
        )
        .all()
    )

    services = (
        db.query(Service)
        .filter(
            Service.provider_id == provider_id
        )
        .all()
    )

    service_list = []

    all_pricing_rows = []

    for service in services:

        pricing = (
            db.query(Pricing)
            .filter(
                Pricing.service_id == service.id
            )
            .all()
        )

        all_pricing_rows.extend(pricing)

        service_list.append({

            "id": service.id,

            "name": service.name,

            "description": service.description,

            "category_id": service.category_id,

            "pricing": pricing

        })

    starting_price = effective_starting_price(
        all_pricing_rows
    )

    return {

        "provider": provider,

        "portfolio": portfolio,

        "services": service_list,

        "starting_price": (
            float(starting_price)
            if starting_price is not None
            else None
        ),

        "rating": float(provider.average_rating or 0),

        "review_count": provider.total_reviews or 0,

    }

@router.post(
    "/{provider_id}/registration-payment",
    response_model=
    RegistrationPaymentResponse
)
    
def create_registration_payment(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )
    if provider.registration_fee_paid:
        raise HTTPException(
            status_code=400,
            detail=(
                "Registration fee already paid"
            )
        )

    test_mode = os.getenv("PAYMENT_TEST_MODE") == "true"

    amount = 100 if test_mode else 99900

    # In test mode, no real Razorpay order is created at all - the
    # live keys in .env are real production credentials, so even a
    # nominal Rs.1 charge would be a genuine transaction, not a
    # sandbox one. A fake order id is generated locally instead, and
    # the frontend skips checkout entirely and calls
    # /providers/{provider_id}/mark-registration-paid directly.
    if test_mode:
        order_id = f"test_order_{secrets.token_hex(16)}"
    else:
        client = razorpay.Client(
            auth=(
                os.getenv(
                    "RAZORPAY_KEY_ID"
                ),
                os.getenv(
                    "RAZORPAY_KEY_SECRET"
                )
            )
        )

        order = client.order.create({
            "amount": amount,
            "currency": "INR"
        })

        order_id = order["id"]

    return {
        "order_id": order_id,
        "amount": amount,
        "currency": "INR",
        "test_mode": test_mode,
    }

def _complete_registration_payment(
    db: Session,
    provider: Provider
):
    """
    Shared by both the real Razorpay-verified path and the dev/test
    "mark as paid" shortcut. Marks the fee paid, generates a fresh
    activation token and emails the provider an activation link -
    they can't log in until they click it (no manual admin
    verification step anymore).
    """

    provider.registration_fee_paid = True
    provider.registration_paid_at = datetime.utcnow()

    db.commit()
    db.refresh(provider)

    token = generate_activation_token(db, provider)

    send_activation_email(
        to_email=provider.email,
        business_name=provider.business_name,
        token=token,
    )

    return provider, token


@router.post("/{provider_id}/mark-registration-paid")
def mark_registration_paid(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    # Dev-only shortcut the frontend calls instead of Razorpay
    # checkout + signature verification when PAYMENT_TEST_MODE=true.
    # Guarded so it can't be used to bypass the registration fee for
    # real if this ever runs with test mode off.
    if os.getenv("PAYMENT_TEST_MODE") != "true":
        raise HTTPException(
            status_code=403,
            detail="Test payment confirmation is disabled."
        )

    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    _, token = _complete_registration_payment(db, provider)

    # Only reachable when PAYMENT_TEST_MODE=true (guarded above) -
    # real registrations always go through verify_registration_payment
    # below instead, which deliberately does NOT return this. Test
    # accounts are routinely created with throwaway/fake email
    # addresses, so there's no other reliable way to hand the person
    # testing the flow their activation link.
    return {
        "success": True,
        "activation_link": build_activation_link(token),
    }


@router.post(
    "/{provider_id}/verify-registration-payment"
)
def verify_registration_payment(
    provider_id: UUID,
    request: PaymentVerificationRequest,
    db: Session = Depends(get_db)
):

    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        raise HTTPException(
            status_code=404,
            detail="Provider not found"
        )

    client = razorpay.Client(
        auth=(
            os.getenv(
                "RAZORPAY_KEY_ID"
            ),
            os.getenv(
                "RAZORPAY_KEY_SECRET"
            )
        )
    )

    try:

        client.utility.verify_payment_signature({
            "razorpay_order_id":
                request.razorpay_order_id,

            "razorpay_payment_id":
                request.razorpay_payment_id,

            "razorpay_signature":
                request.razorpay_signature
        })

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed"
        )

    _complete_registration_payment(db, provider)

    # Real payment path - deliberately doesn't return the activation
    # link/token (see mark_registration_paid's test-mode-only version
    # above); a genuine registration should only ever get it via the
    # actual email.
    return {
        "success": True
    }


@router.post(
    "/activate",
    response_model=ActivateAccountResponse
)
def activate_account(
    request: ActivateAccountRequest,
    db: Session = Depends(get_db)
):
    provider = activate_provider_account(
        db,
        request.token
    )

    if not provider:
        raise HTTPException(
            status_code=400,
            detail=(
                "This activation link is invalid or has already "
                "been used."
            )
        )

    return {
        "success": True,
        "business_name": provider.business_name,
        "email": provider.email,
    }