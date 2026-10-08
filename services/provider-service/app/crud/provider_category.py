from app.db.models.provider_categories import (
    ProviderCategory
)
from app.db.models.provider import Provider
from app.db.models.service import Service
from app.db.models.pricing import Pricing
from app.db.models.blocked_date import BlockedDate
from app.db.models.portfolio import Portfolio


def _cover_image_for(db, provider):
    """
    The provider's own display picture wins if they've set one, then
    the cover image / logo uploaded during registration's "Business
    Photos & Video" step (see the matching fallback chain + comment in
    api/search.py), otherwise fall back to their first portfolio
    image. Neither existing is handled on the frontend with a colored
    icon tile.
    """

    cover_image = (
        provider.display_picture_url
        or provider.cover_image_url
        or provider.logo_url
    )

    if not cover_image:
        cover_photo = (
            db.query(Portfolio)
            .filter(
                Portfolio.provider_id == provider.id,
                Portfolio.media_type == "IMAGE"
            )
            .first()
        )
        cover_image = cover_photo.media_url if cover_photo else None

    return cover_image


def _pricing_list_for_services(db, services):

    pricing_list = []

    for service in services:

        pricing_rows = (
            db.query(Pricing)
            .filter(
                Pricing.service_id == service.id
            )
            .all()
        )

        for pricing in pricing_rows:
            pricing_list.append({
                "id": pricing.id,
                "service_id": pricing.service_id,
                "pricing_type": pricing.pricing_type,
                "amount": float(pricing.amount),
                "unit": pricing.unit,
                "min_quantity": (
                    float(pricing.min_quantity)
                    if pricing.min_quantity is not None
                    else None
                ),
                "max_quantity": (
                    float(pricing.max_quantity)
                    if pricing.max_quantity is not None
                    else None
                ),
            })

    return pricing_list


def _blocked_service_ids(db, on_date):
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


def assign_categories(
    db,
    provider_id,
    categories
):

    existing = (
        db.query(ProviderCategory)
        .filter(
            ProviderCategory.provider_id
            == provider_id
        )
        .all()
    )

    for item in existing:
        db.delete(item)

    db.commit()

    for category in categories.categories:

        db.add(
            ProviderCategory(
                provider_id=provider_id,
                category_id=category.category_id,
                subcategory_id=category.subcategory_id
            )
        )

    db.commit()

    return (
        db.query(ProviderCategory)
        .filter(
            ProviderCategory.provider_id
            == provider_id
        )
        .all()
    )


def get_provider_categories(
    db,
    provider_id
):
    return (
        db.query(ProviderCategory)
        .filter(
            ProviderCategory.provider_id
            == provider_id
        )
        .all()
    )

def get_providers_for_category(
    db,
    category_id,
    state_id=None,
    district_id=None,
    location_id=None,
    on_date=None
):
    query = (
        db.query(Provider)
        .join(
            Service,
            Service.provider_id == Provider.id
        )
        .filter(
            Provider.verification_status == "VERIFIED",
            Service.category_id == category_id
        )
    )

    if state_id:
        query = query.filter(
            Provider.state_id == state_id
        )

    if district_id:
        query = query.filter(
            Provider.district_id == district_id
        )

    if location_id:
        query = query.filter(
            Provider.location_id == location_id
        )

    providers = query.distinct().all()

    unavailable_service_ids = (
        _blocked_service_ids(db, on_date)
        if on_date
        else set()
    )

    results = []

    for provider in providers:

        services = (
            db.query(Service)
            .filter(
                Service.provider_id == provider.id,
                Service.category_id == category_id
            )
            .all()
        )

        services = [
            service
            for service in services
            if service.id not in unavailable_service_ids
        ]

        pricing_list = _pricing_list_for_services(db, services)

        if not pricing_list:
            continue

        results.append({
            "id": provider.id,
            "business_name": provider.business_name,
            "state_id": provider.state_id,
            "district_id": provider.district_id,
            "location_id": provider.location_id,
            "pricing": pricing_list,
            "cover_image": _cover_image_for(db, provider),
        })

    return results


def get_recently_added_providers(
    db,
    state_id=None,
    district_id=None,
    location_id=None,
    limit=20
):
    """
    Powers the customer app's Browse screen default view - the newest
    verified providers across every category, instead of always
    landing on one arbitrary category (previously always
    "Accommodation"). Same result shape as get_providers_for_category
    (CategoryProvider on the frontend) so ProviderCard can render
    either list without changes, except pricing spans all of a
    provider's services rather than just one category's.
    """

    query = db.query(Provider).filter(
        Provider.verification_status == "VERIFIED"
    )

    if state_id:
        query = query.filter(Provider.state_id == state_id)

    if district_id:
        query = query.filter(Provider.district_id == district_id)

    if location_id:
        query = query.filter(Provider.location_id == location_id)

    providers = (
        query
        .order_by(Provider.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []

    for provider in providers:

        services = (
            db.query(Service)
            .filter(Service.provider_id == provider.id)
            .all()
        )

        pricing_list = _pricing_list_for_services(db, services)

        if not pricing_list:
            continue

        results.append({
            "id": provider.id,
            "business_name": provider.business_name,
            "state_id": provider.state_id,
            "district_id": provider.district_id,
            "location_id": provider.location_id,
            "pricing": pricing_list,
            "cover_image": _cover_image_for(db, provider),
        })

    return results


def delete_provider_category(
    db,
    provider_id,
    mapping_id
):
    mapping = (
        db.query(ProviderCategory)
        .filter(
            ProviderCategory.id == mapping_id,
            ProviderCategory.provider_id == provider_id
        )
        .first()
    )

    if not mapping:
        return False

    db.delete(mapping)

    db.commit()

    return True