import json

from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlalchemy import or_, and_, exists
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.db.models.portfolio import Portfolio
from app.db.models.service import Service

from app.db.models.pricing import Pricing
from app.db.models.blocked_date import BlockedDate

from app.db.models.provider import Provider
from app.db.models.provider_categories import ProviderCategory
from uuid import UUID

from app.schemas.search import (
    ProviderSearchResponse
)
from app.utils.pricing import effective_starting_price

router = APIRouter(
    prefix="/search",
    tags=["Search"]
)

@router.get(
    "/providers",
    response_model=list[
        ProviderSearchResponse
    ]
)
def search_providers(
    state: int | None = None,
    district: int | None = None,
    location: int | None = None,

    category_id: UUID | None = None,
    subcategory_id: UUID | None = None,

    keyword: str | None = None,

    db: Session = Depends(get_db)
):

    # Selecting Provider alongside ProviderCategory's own columns and
    # joining directly (as this used to) fans out into one row per
    # matching ProviderCategory entry - a provider tagged under both
    # "Hotels" and "Resorts" (both Accommodation) would come back
    # twice, which React then flags as a duplicate-key error on the
    # results list. Filtering via EXISTS instead keeps the Provider
    # query itself to one row per provider regardless of how many
    # category/subcategory rows they're tagged with.
    query = (
        db.query(Provider)
        .filter(
            Provider.verification_status == "VERIFIED"
        )
    )

    if state:
        query = query.filter(
            Provider.state_id == state
        )

    if district:
        query = query.filter(
            Provider.district_id == district
        )

    if location:
        query = query.filter(
            Provider.location_id == location
        )

    if category_id or subcategory_id:
        category_conditions = [
            ProviderCategory.provider_id == Provider.id
        ]

        if category_id:
            category_conditions.append(
                ProviderCategory.category_id == category_id
            )

        if subcategory_id:
            category_conditions.append(
                ProviderCategory.subcategory_id == subcategory_id
            )

        query = query.filter(
            exists().where(and_(*category_conditions))
        )

    if keyword:
        # Business-name match alone isn't enough here - a customer who
        # picks a category from the dropdown and then types something
        # like a subcategory/service name (e.g. "Bridal Makeup") is
        # searching for what's offered, not for a business's name, and
        # that word essentially never appears in business_name. Also
        # match it against the name/description of services the
        # provider actually offers (scoped to the same category /
        # subcategory filters already applied above), so picking a
        # category and typing a related term finds providers instead
        # of always coming back empty.
        keyword_like = f"%{keyword}%"

        matching_service_provider_ids = db.query(
            Service.provider_id
        ).filter(
            or_(
                Service.name.ilike(keyword_like),
                Service.description.ilike(keyword_like),
            )
        )

        if category_id:
            matching_service_provider_ids = (
                matching_service_provider_ids.filter(
                    Service.category_id == category_id
                )
            )

        if subcategory_id:
            matching_service_provider_ids = (
                matching_service_provider_ids.filter(
                    Service.subcategory_id == subcategory_id
                )
            )

        query = query.filter(
            or_(
                Provider.business_name.ilike(keyword_like),
                Provider.id.in_(matching_service_provider_ids),
            )
        )

    providers = query.distinct().all()

    results = []

    for provider in providers:
        # Priority: the dedicated "display picture" (set from a
        # provider's dashboard) wins if present, then the cover image
        # and logo uploaded during the registration wizard's "Business
        # Photos & Video" step (Tab 1 - handleMediaUpload("cover"/
        # "logo") in ProviderRegistrationWizard.tsx, which writes to
        # cover_image_url/logo_url, NOT display_picture_url), then
        # finally the first portfolio image. Previously this only
        # checked display_picture_url + portfolio, so a provider who
        # only completed registration (uploaded a logo/cover there but
        # never separately set a "display picture" or added
        # portfolio images) showed no image at all in search/Browse
        # (see crud/provider_category.py for the same fallback chain
        # used by the mobile Browse screen).
        cover_image = (
            provider.display_picture_url
            or provider.cover_image_url
            or provider.logo_url
        )

        if not cover_image:
            portfolio = (
                db.query(Portfolio)
                .filter(
                    Portfolio.provider_id == provider.id
                )
                .first()
            )
            cover_image = portfolio.media_url if portfolio else None


        provider_pricing_rows = (
            db.query(Pricing)
            .join(
                Service,
                Service.id ==
                Pricing.service_id
            )
            .filter(
                Service.provider_id ==
                provider.id
            )
            .all()
        )

        starting_price = effective_starting_price(
            provider_pricing_rows
        )

        # Category-specific spec fields (Amenities, Cuisine, etc.) only
        # make sense once we know which category we're looking at - a
        # provider can have services in several categories, each with
        # a different attribute schema client-side (see
        # utils/serviceAttributesSchema.ts), so this is scoped to the
        # searched category/subcategory rather than merging every
        # service's attributes together. Left as {} when no category
        # filter is active.
        attributes: dict = {}

        if category_id:
            attribute_service_query = db.query(Service).filter(
                Service.provider_id == provider.id,
                Service.category_id == category_id
            )

            if subcategory_id:
                attribute_service_query = (
                    attribute_service_query.filter(
                        Service.subcategory_id == subcategory_id
                    )
                )

            attribute_service = attribute_service_query.first()

            if attribute_service and attribute_service.attributes:
                try:
                    attributes = json.loads(
                        attribute_service.attributes
                    )
                except (TypeError, ValueError):
                    attributes = {}

        results.append({

            "id": provider.id,

            "business_name":
                provider.business_name,

            "owner_name":
                provider.owner_name,

            "state_id": provider.state_id,

            "district_id": provider.district_id,

            "location_id": provider.location_id,

            "address": provider.address,

            "verification_status":
                provider.verification_status,

            "category_id": category_id,
            "subcategory_id": subcategory_id,

            "cover_image": cover_image,

            "starting_price": (
                float(starting_price)
                if starting_price is not None
                else None
            ),

            "rating": float(provider.average_rating or 0),

            "review_count": provider.total_reviews or 0,

        })

    return results


def _blocked_service_ids(db: Session, on_date: date_type):
    """
    Service ids that have a blocked-date range covering on_date
    (either from a provider manually blocking the date, or from an
    existing booking that auto-blocked it).
    """

    rows = (
        db.query(BlockedDate.service_id)
        .filter(
            BlockedDate.blocked_from <= on_date,
            BlockedDate.blocked_to >= on_date
        )
        .all()
    )

    return {row.service_id for row in rows}


@router.get(
    "/category/{category_id}/services"
)
def search_services_by_category(
    category_id: UUID,

    state: int | None = None,
    district: int | None = None,
    location: int | None = None,
    date: date_type | None = None,

    db: Session = Depends(get_db)
):

    query = (
        db.query(Provider, Service)
        .join(
            Service,
            Service.provider_id == Provider.id
        )
        .filter(
            Provider.verification_status == "VERIFIED",
            Service.category_id == category_id
        )
    )

    if state:
        query = query.filter(
            Provider.state_id == state
        )

    if district:
        query = query.filter(
            Provider.district_id == district
        )

    if location:
        query = query.filter(
            Provider.location_id == location
        )

    rows = query.all()

    if date:
        unavailable = _blocked_service_ids(db, date)

        rows = [
            (provider, service)
            for provider, service in rows
            if service.id not in unavailable
        ]

    results = []

    for provider, service in rows:

        cheapest_pricing = (
            db.query(Pricing)
            .filter(
                Pricing.service_id == service.id
            )
            .order_by(Pricing.amount.asc())
            .first()
        )

        results.append({
            "provider_id": provider.id,
            "provider_name": provider.business_name,

            "service_id": service.id,
            "service_name": service.name,

            "category_id": service.category_id,

            "occupancy_per_room": (
                cheapest_pricing.occupancy_per_room
                if cheapest_pricing
                else None
            ),

            "total_rooms": (
                cheapest_pricing.total_rooms
                if cheapest_pricing
                else None
            ),

            "pricing_id": (
                cheapest_pricing.id
                if cheapest_pricing
                else None
            ),

            "price": (
                float(cheapest_pricing.amount)
                if cheapest_pricing
                else 0
            ),

            "pricing_type": (
                cheapest_pricing.pricing_type
                if cheapest_pricing
                else None
            ),

            "unit": (
                cheapest_pricing.unit
                if cheapest_pricing
                else None
            ),

            "min_quantity": (
                float(cheapest_pricing.min_quantity)
                if cheapest_pricing
                and cheapest_pricing.min_quantity is not None
                else None
            ),

            "max_quantity": (
                float(cheapest_pricing.max_quantity)
                if cheapest_pricing
                and cheapest_pricing.max_quantity is not None
                else None
            ),

            "rating": float(
                provider.average_rating or 0
            ),
        })

    return results