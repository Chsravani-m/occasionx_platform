import json
import secrets

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.pricing import Pricing
from app.db.models.provider import Provider
from datetime import datetime
from app.db.models.provider_document import (
    ProviderDocument
)
from app.db.models.service import Service
from app.db.models.portfolio import Portfolio
from app.db.models.provider_categories import ProviderCategory

def create_provider(
    db: Session,
    provider_data
):
    data = provider_data.model_dump()

    # Primary category/subcategory (Tab 4) may not be known yet - the
    # 7-tab wizard creates the account right after Tab 2 (Contact
    # Details), before the provider has reached Services. Only create
    # the ProviderCategory row if both were actually supplied.
    category_id = data.pop("category_id", None)
    subcategory_id = data.pop("subcategory_id", None)

    provider = Provider(**data)

    db.add(provider)
    db.flush()

    if category_id and subcategory_id:
        provider_category = ProviderCategory(
            provider_id=provider.id,
            category_id=category_id,
            subcategory_id=subcategory_id
        )

        db.add(provider_category)

    db.commit()
    db.refresh(provider)

    return provider


# ------------------------------------------------------------------
# Registration wizard per-tab helpers. Fields that are lists/dicts are
# stored as JSON-encoded Text columns on Provider (this codebase's
# existing convention - see razorpay_account_requirements), so each
# helper below handles the json.dumps/json.loads itself rather than
# leaning on the generic update_provider() dict-assignment used for
# plain scalar fields.
# ------------------------------------------------------------------

_JSON_LIST_FIELDS = {
    "branches",
    "languages_spoken",
    "payment_modes",
    "weekly_off",
    "holidays",
}

_JSON_DICT_FIELDS = {
    "business_hours",
}


def _apply_tab_update(db, provider_id, update_data: dict):
    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        return None

    for key, value in update_data.items():
        if key in _JSON_LIST_FIELDS or key in _JSON_DICT_FIELDS:
            setattr(provider, key, json.dumps(value) if value is not None else None)
        else:
            setattr(provider, key, value)

    db.commit()
    db.refresh(provider)

    return provider


def _decode_json_field(raw, default):
    if not raw:
        return default

    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return default


def update_provider_location(db, provider_id, update):
    provider = _apply_tab_update(
        db, provider_id, update.model_dump(exclude_unset=True)
    )

    if not provider:
        return None

    return {
        "country": provider.country,
        "state_id": provider.state_id,
        "district_id": provider.district_id,
        "location_id": provider.location_id,
        "area": provider.area,
        "postal_code": provider.postal_code,
        "address": provider.address,
        "google_map_url": provider.google_map_url,
        "service_radius_km": provider.service_radius_km,
        "branches": _decode_json_field(provider.branches, []),
    }


def get_provider_location(db, provider_id):
    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        return None

    return {
        "country": provider.country,
        "state_id": provider.state_id,
        "district_id": provider.district_id,
        "location_id": provider.location_id,
        "area": provider.area,
        "postal_code": provider.postal_code,
        "address": provider.address,
        "google_map_url": provider.google_map_url,
        "service_radius_km": provider.service_radius_km,
        "branches": _decode_json_field(provider.branches, []),
    }


def update_provider_services_tab(db, provider_id, update):
    provider = _apply_tab_update(
        db, provider_id, update.model_dump(exclude_unset=True)
    )

    if not provider:
        return None

    return {
        "languages_spoken": _decode_json_field(provider.languages_spoken, []),
        "years_of_experience": provider.years_of_experience,
        "team_size": provider.team_size,
    }


def get_provider_services_tab(db, provider_id):
    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        return None

    return {
        "languages_spoken": _decode_json_field(provider.languages_spoken, []),
        "years_of_experience": provider.years_of_experience,
        "team_size": provider.team_size,
    }


def update_provider_pricing_tab(db, provider_id, update):
    provider = _apply_tab_update(
        db, provider_id, update.model_dump(exclude_unset=True)
    )

    if not provider:
        return None

    return {
        "starting_price": provider.starting_price,
        "price_range_min": provider.price_range_min,
        "price_range_max": provider.price_range_max,
        "custom_quotation_available": provider.custom_quotation_available,
        "advance_percentage": provider.advance_percentage,
        "payment_modes": _decode_json_field(provider.payment_modes, []),
        "cancellation_policy": provider.cancellation_policy,
    }


def get_provider_pricing_tab(db, provider_id):
    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        return None

    return {
        "starting_price": provider.starting_price,
        "price_range_min": provider.price_range_min,
        "price_range_max": provider.price_range_max,
        "custom_quotation_available": provider.custom_quotation_available,
        "advance_percentage": provider.advance_percentage,
        "payment_modes": _decode_json_field(provider.payment_modes, []),
        "cancellation_policy": provider.cancellation_policy,
    }


def update_provider_availability_tab(db, provider_id, update):
    provider = _apply_tab_update(
        db, provider_id, update.model_dump(exclude_unset=True)
    )

    if not provider:
        return None

    return {
        "business_hours": _decode_json_field(provider.business_hours, {}),
        "weekly_off": _decode_json_field(provider.weekly_off, []),
        "holidays": _decode_json_field(provider.holidays, []),
        "instant_booking": provider.instant_booking,
        "calendar_integration_enabled": provider.calendar_integration_enabled,
    }


def get_provider_availability_tab(db, provider_id):
    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        return None

    return {
        "business_hours": _decode_json_field(provider.business_hours, {}),
        "weekly_off": _decode_json_field(provider.weekly_off, []),
        "holidays": _decode_json_field(provider.holidays, []),
        "instant_booking": provider.instant_booking,
        "calendar_integration_enabled": provider.calendar_integration_enabled,
    }


def update_provider_kyc(db, provider_id, update):
    provider = _apply_tab_update(
        db, provider_id, update.model_dump(exclude_unset=True)
    )

    if not provider:
        return None

    return {
        "aadhaar_number": provider.aadhaar_number,
        "pan_number": provider.pan_number,
        "gst_number": provider.gst_number,
        "cancelled_cheque_url": provider.cancelled_cheque_url,
    }


def get_provider(
    db: Session,
    provider_id
):
    return (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

def get_provider_by_id(db, provider_id):
    return (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )


def add_provider_rating(db: Session, provider_id, rating: int):
    """
    Folds one new rating into a provider's running average - called
    by booking-service whenever a customer submits a review, so this
    is the single place that owns the average_rating/total_reviews
    columns' math.
    """

    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        return None

    current_total = provider.total_reviews or 0
    current_average = float(provider.average_rating or 0)

    new_total = current_total + 1
    new_average = (
        (current_average * current_total) + rating
    ) / new_total

    provider.total_reviews = new_total
    provider.average_rating = round(new_average, 2)

    db.commit()
    db.refresh(provider)

    return provider

def update_provider(
    db,
    provider_id,
    provider_data
):
    provider = (
        db.query(Provider)
        .filter(Provider.id == provider_id)
        .first()
    )

    if not provider:
        return None

    for key, value in provider_data.model_dump(
        exclude_unset=True
    ).items():
        setattr(provider, key, value)

    db.commit()
    db.refresh(provider)

    return provider

def get_all_providers(db):
    return db.query(Provider).all()


def verify_provider(
    db,
    provider_id,
    verification_status,
    rejection_reason=None
):
    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        return None

    provider.verification_status = verification_status

    if verification_status == "VERIFIED":
        provider.verified_at = datetime.utcnow()

    if verification_status == "REJECTED":
        provider.rejection_reason = rejection_reason

    db.commit()
    db.refresh(provider)

    return provider

def generate_activation_token(
    db: Session,
    provider: Provider
) -> str:
    """
    Called once the registration fee payment succeeds. Generates a
    fresh one-time activation token and stores it on the provider
    row so the emailed link can be validated later.
    """

    token = secrets.token_urlsafe(32)

    provider.activation_token = token

    db.commit()
    db.refresh(provider)

    return token


def activate_provider_account(
    db: Session,
    token: str
):
    """
    Consumes an activation token from the emailed link. Also marks
    the provider VERIFIED automatically - there's no manual admin
    approval step anymore, activation via the paid registration
    email is the only gate.
    """

    provider = (
        db.query(Provider)
        .filter(
            Provider.activation_token == token
        )
        .first()
    )

    if not provider:
        return None

    provider.account_activated = True
    provider.activated_at = datetime.utcnow()
    provider.activation_token = None

    provider.verification_status = "VERIFIED"
    provider.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(provider)

    return provider


def get_pending_providers(db):
    return (
        db.query(Provider)
        .filter(
            Provider.verification_status == "PENDING"
        )
        .all()
    )
def get_provider_stats(db):
    total = db.query(Provider).count()

    pending = (
        db.query(Provider)
        .filter(
            Provider.verification_status == "PENDING"
        )
        .count()
    )

    verified = (
        db.query(Provider)
        .filter(
            Provider.verification_status == "VERIFIED"
        )
        .count()
    )

    rejected = (
        db.query(Provider)
        .filter(
            Provider.verification_status == "REJECTED"
        )
        .count()
    )

    return {
        "total": total,
        "pending": pending,
        "verified": verified,
        "rejected": rejected
    }

def get_verified_providers(db):
    return (
        db.query(Provider)
        .filter(
            Provider.verification_status == "VERIFIED"
        )
        .all()
    )

def get_provider_verification_details(
    db,
    provider_id
):
    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        return None

    documents = (
        db.query(ProviderDocument)
        .filter(
            ProviderDocument.provider_id
            == provider_id
        )
        .all()
    )

    return {
        "provider": provider,
        "documents": documents
    }

def get_provider_by_user_id(
    db,
    user_id
):
    return (
        db.query(Provider)
        .filter(
            Provider.user_id == user_id
        )
        .first()
    )

def get_provider_dashboard(
    db,
    provider_id
):
    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        return None

    documents_uploaded = (
        db.query(ProviderDocument)
        .filter(
            ProviderDocument.provider_id
            == provider_id
        )
        .count()
    )

    services_count = (
        db.query(Service)
        .filter(
            Service.provider_id
            == provider_id
        )
        .count()
    )

    portfolio_count = (
        db.query(Portfolio)
        .filter(
            Portfolio.provider_id
            == provider_id
        )
        .count()
    )

    categories_count = (
        db.query(ProviderCategory)
        .filter(
            ProviderCategory.provider_id
            == provider_id
        )
        .count()
    )

    pricing_completed = (
        db.query(Pricing)
        .join(
            Service,
            Pricing.service_id == Service.id
        )
        .filter(
            Service.provider_id == provider_id
        )
        .count()
    ) > 0

    return {
        "provider_id": provider.id,
        "business_name": provider.business_name,
        "verification_status": provider.verification_status,
        "owner_name": provider.owner_name,
        "email": provider.email,
        "phone": provider.phone,
        "documents_uploaded": documents_uploaded,
        "services_count": services_count,
        "portfolio_count": portfolio_count,
        "categories_count": categories_count,

        "pricing_completed": pricing_completed,

        "registration_fee_paid":
            provider.registration_fee_paid,

        "account_activated":
            provider.account_activated,

        "onboarding_completed": (
            documents_uploaded > 0
            and portfolio_count > 0
            and services_count > 0
            and pricing_completed
            and provider.registration_fee_paid
        ),

        "profile_views": provider.profile_views or 0,
        "average_rating": float(provider.average_rating or 0),
        "total_reviews": provider.total_reviews or 0,

        "display_picture_url": provider.display_picture_url,
        "cover_image_url": provider.cover_image_url,
    }