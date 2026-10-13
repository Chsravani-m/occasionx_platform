from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.db.models.location import Location

from app.schemas.location import (
    StateResponse,
    DistrictResponse,
    LocationResponse,
    LocationResolveResponse,
    LocationLabelResponse,
    LocationLabelsRequest,
    LocationLabelsResponse
)
from app.schemas.location_admin import (
    CreateLocationRequest,
    UpdateLocationRequest
)

from app.crud.location import (
    get_states,
    get_districts,
    get_locations,
    resolve_location,
    get_location_label,
    get_location_labels
)


from app.core.service_auth import require_admin

router = APIRouter(
    prefix="/locations",
    tags=["Locations"]
)


@router.get(
    "/states",
    response_model=list[StateResponse]
)
def list_states(
    db: Session = Depends(get_db)
):
    return get_states(db)


@router.get(
    "/states/{state_id}/districts",
    response_model=list[DistrictResponse]
)
def list_districts(
    state_id: int,
    db: Session = Depends(get_db)
):
    return get_districts(
        db,
        state_id
    )


@router.get(
    "/districts/{district_id}/locations",
    response_model=list[LocationResponse]
)
def list_locations(
    district_id: int,
    db: Session = Depends(get_db)
):
    return get_locations(
        db,
        district_id
    )

@router.get(
    "/resolve",
    response_model=LocationResolveResponse
)
def resolve_location_api(
    district: str,
    state: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Used by the header search bar to turn a customer's detected/saved
    location (free text, from reverse-geocoding or manual entry) into
    the catalog's own state_id/district_id, so search results can be
    scoped to their area instead of showing every provider in every
    location.
    """

    match = resolve_location(
        db,
        district_name=district,
        state_name=state
    )

    if not match:
        return LocationResolveResponse(matched=False)

    return LocationResolveResponse(
        matched=True,
        **match
    )


@router.get(
    "/label",
    response_model=LocationLabelResponse
)
def location_label(
    state_id: int | None = None,
    district_id: int | None = None,
    location_id: int | None = None,
    db: Session = Depends(get_db)
):
    """
    Used by provider profile pages (web ProviderHero.tsx/ProviderCard.tsx,
    mobile ProviderDetailsScreen.tsx) to show a real city/district when
    a provider left the optional Business Address field blank at
    registration, instead of the "Location available after booking"
    placeholder that used to show regardless of whether we actually
    had location data for them.
    """

    return get_location_label(
        db,
        state_id=state_id,
        district_id=district_id,
        location_id=location_id
    )


@router.post(
    "/labels",
    response_model=LocationLabelsResponse
)
def location_labels(
    request: LocationLabelsRequest,
    db: Session = Depends(get_db)
):
    """
    Batch counterpart to /locations/label (GET) - used by list/grid
    pages rendering many provider cards at once (e.g. app/search/page.tsx
    via ProviderCard.tsx) so every card's missing-address fallback can
    be resolved in a single request instead of one per card.
    """

    return get_location_labels(
        db,
        state_ids=request.state_ids,
        district_ids=request.district_ids,
        location_ids=request.location_ids
    )


@router.post("/admin/locations")
def create_location(
    request: CreateLocationRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
):
    location = Location(
        district_id=request.district_id,
        name=request.name
    )

    db.add(location)
    db.commit()
    db.refresh(location)

    return location

@router.put("/admin/locations/{location_id}")
def update_location(
    location_id: int,
    request: UpdateLocationRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
):
    location = (
        db.query(Location)
        .filter(Location.id == location_id)
        .first()
    )

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    location.name = request.name

    db.commit()
    db.refresh(location)

    return location

@router.delete("/admin/locations/{location_id}")
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
):
    location = (
        db.query(Location)
        .filter(Location.id == location_id)
        .first()
    )

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    db.delete(location)
    db.commit()

    return {
        "message": "Location deleted"
    }

