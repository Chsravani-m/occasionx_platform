from app.db.models.state import State
from app.db.models.district import District
from app.db.models.location import Location


def resolve_location(
    db,
    district_name=None,
    state_name=None
):
    """
    Best-effort match of free-text district/state names (e.g. from
    reverse-geocoding a browser's GPS position, which rarely lines up
    exactly with how a name was typed into the catalog) against the
    States/Districts tables. Tries an exact case-insensitive match
    first, then falls back to a substring match in both directions,
    so "Ranga Reddy" still matches a catalog row named "Rangareddy"
    and vice versa.

    Returns None if nothing usable was found - callers should treat
    that as "don't filter by location" rather than an error, so a
    customer outside the app's currently-seeded areas still sees
    results instead of a blank page.
    """

    if not district_name:
        return None

    district_query = db.query(District)

    state = None

    if state_name:
        state = (
            db.query(State)
            .filter(State.name.ilike(state_name))
            .first()
        )

        if not state:
            state = (
                db.query(State)
                .filter(State.name.ilike(f"%{state_name}%"))
                .first()
            )

        if state:
            district_query = district_query.filter(
                District.state_id == state.id
            )

    district = (
        district_query
        .filter(District.name.ilike(district_name))
        .first()
    )

    if not district:
        district = (
            district_query
            .filter(
                District.name.ilike(f"%{district_name}%")
            )
            .first()
        )

    first_word = district_name.split()[0] if district_name.split() else None

    if not district and first_word:
        district = (
            district_query
            .filter(
                District.name.ilike(f"%{first_word}%")
            )
            .first()
        )

    if not district:
        return None

    if not state:
        state = (
            db.query(State)
            .filter(State.id == district.state_id)
            .first()
        )

    return {
        "state_id": district.state_id,
        "district_id": district.id,
        "state_name": state.name if state else None,
        "district_name": district.name,
    }


def get_states(db):

    return (
        db.query(State)
        .order_by(State.name)
        .all()
    )


def get_districts(
    db,
    state_id
):
    return (
        db.query(District)
        .filter(
            District.state_id == state_id
        )
        .order_by(District.name)
        .all()
    )


def get_locations(
    db,
    district_id
):
    return (
        db.query(Location)
        .filter(
            Location.district_id == district_id
        )
        .order_by(Location.name)
        .all()
    )


def get_location_label(
    db,
    state_id=None,
    district_id=None,
    location_id=None
):
    """
    One-shot lookup of display names for whichever ids are passed -
    used to render a provider's city/district when they never filled
    in a free-text address (see LocationLabelResponse for why this
    exists). Missing/unmatched ids just come back None rather than
    erroring, since a provider might only have a state_id set this
    early in registration.
    """

    state_name = None
    district_name = None
    location_name = None

    if state_id:
        state = (
            db.query(State)
            .filter(State.id == state_id)
            .first()
        )
        state_name = state.name if state else None

    if district_id:
        district = (
            db.query(District)
            .filter(District.id == district_id)
            .first()
        )
        district_name = district.name if district else None

    if location_id:
        location = (
            db.query(Location)
            .filter(Location.id == location_id)
            .first()
        )
        location_name = location.name if location else None

    return {
        "state_name": state_name,
        "district_name": district_name,
        "location_name": location_name,
    }


def get_location_labels(
    db,
    state_ids=None,
    district_ids=None,
    location_ids=None
):
    """
    Batch version of get_location_label - a search results page needs
    this resolved for every card at once, and firing one request per
    card would mean dozens of round trips for a single page load.
    Returns id -> name maps; ids with no match are simply absent.
    """

    states = {}
    districts = {}
    locations = {}

    if state_ids:
        rows = (
            db.query(State)
            .filter(State.id.in_(state_ids))
            .all()
        )
        states = {row.id: row.name for row in rows}

    if district_ids:
        rows = (
            db.query(District)
            .filter(District.id.in_(district_ids))
            .all()
        )
        districts = {row.id: row.name for row in rows}

    if location_ids:
        rows = (
            db.query(Location)
            .filter(Location.id.in_(location_ids))
            .all()
        )
        locations = {row.id: row.name for row in rows}

    return {
        "states": states,
        "districts": districts,
        "locations": locations,
    }