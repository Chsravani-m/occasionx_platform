"""
Who may change (or privately read) a provider's records.

A provider's own login (token `sub` == Provider.user_id), an admin, or
another OccasionX service. Every write endpoint in this service, and
every read of private data (bank details, KYC documents, dashboard),
goes through one of these helpers.
"""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.service_auth import is_admin
from app.db.models.provider import Provider
from app.db.models.service import Service
from app.db.models.pricing import Pricing
from app.db.models.blocked_date import BlockedDate
from app.db.models.portfolio import Portfolio


# Fields only the provider themselves (or an admin) may see. Public
# endpoints return provider records with these blanked out.
PRIVATE_PROVIDER_FIELDS = (
    "pan_number",
    "aadhaar_number",
    "cancelled_cheque_url",
    "business_registration_number",
    "bank_account_holder_name",
    "bank_account_number",
    "bank_ifsc_code",
    "bank_name",
    "razorpay_linked_account_id",
    "activation_token",
    "registration_order_id",
)


def can_manage(user: dict | None, provider: Provider | None) -> bool:
    if user is None or provider is None:
        return False
    if is_admin(user):
        return True
    return str(provider.user_id) == str(user.get("sub"))


def _get_provider(db: Session, provider_id) -> Provider:
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider


def ensure_can_manage_provider(db: Session, user: dict, provider_id) -> Provider:
    provider = _get_provider(db, provider_id)
    if not can_manage(user, provider):
        raise HTTPException(
            status_code=403,
            detail="You can only manage your own provider account",
        )
    return provider


def ensure_can_manage_service(db: Session, user: dict, service_id: UUID) -> Service:
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    ensure_can_manage_provider(db, user, service.provider_id)
    return service


def ensure_can_manage_pricing(db: Session, user: dict, pricing_id: UUID) -> Pricing:
    pricing = db.query(Pricing).filter(Pricing.id == pricing_id).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="Pricing not found")
    ensure_can_manage_service(db, user, pricing.service_id)
    return pricing


def ensure_can_manage_blocked_date(
    db: Session, user: dict, blocked_id: UUID
) -> BlockedDate:
    blocked = db.query(BlockedDate).filter(BlockedDate.id == blocked_id).first()
    if not blocked:
        raise HTTPException(status_code=404, detail="Blocked date not found")
    ensure_can_manage_service(db, user, blocked.service_id)
    return blocked


def ensure_can_manage_portfolio(
    db: Session, user: dict, portfolio_id: UUID
) -> Portfolio:
    item = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    ensure_can_manage_provider(db, user, item.provider_id)
    return item


def public_provider(provider: Provider, user: dict | None = None):
    """
    The provider record as the caller may see it: complete for the
    owner/admin, with PRIVATE_PROVIDER_FIELDS blanked for everyone else.
    Returns a plain dict so the ORM object itself is never modified.
    """
    if provider is None:
        return None

    data = {
        column.key: getattr(provider, column.key)
        for column in provider.__mapper__.column_attrs
    }

    # Non-column attributes some endpoints attach before returning
    # (e.g. state_name / district_name / location_name).
    for key, value in vars(provider).items():
        if not key.startswith("_") and key not in data:
            data[key] = value

    if not can_manage(user, provider):
        for field in PRIVATE_PROVIDER_FIELDS:
            if field in data:
                data[field] = None

    return data
