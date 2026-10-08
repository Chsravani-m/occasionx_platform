from pydantic import BaseModel


class StateResponse(BaseModel):

    id: int
    name: str

    class Config:
        from_attributes = True


class DistrictResponse(BaseModel):

    id: int
    state_id: int
    name: str

    class Config:
        from_attributes = True


class LocationResponse(BaseModel):

    id: int
    district_id: int
    name: str

    class Config:
        from_attributes = True


class LocationResolveResponse(BaseModel):
    """
    Best-effort match of a free-text district/state name (e.g. from
    reverse-geocoding a browser's GPS coordinates) against the
    catalog's own State/District tables, so the header search bar can
    filter results to the customer's own area instead of every
    location. `matched` is False when nothing close enough was found
    - callers should just skip location filtering in that case rather
    than showing zero results.
    """

    matched: bool
    state_id: int | None = None
    district_id: int | None = None
    state_name: str | None = None
    district_name: str | None = None


class LocationLabelResponse(BaseModel):
    """
    Turns the numeric state_id/district_id/location_id a provider
    picked from the registration wizard's dropdowns (see
    ProviderRegistrationWizard.tsx Tab 3) back into display names, so
    a provider's profile can show "Gachibowli, Hyderabad" even when
    they left the free-text Business Address field blank (that field
    is optional - only the State/District/City dropdowns are
    required) instead of the site falling back to a vague placeholder.
    Any id that doesn't resolve (or wasn't passed) comes back None.
    """

    state_name: str | None = None
    district_name: str | None = None
    location_name: str | None = None


class LocationLabelsRequest(BaseModel):
    """
    Batch counterpart to /locations/label - a search results page
    renders many provider cards at once, and firing one request per
    card would mean dozens of round trips. Callers collect every
    distinct id they need resolved across the whole page and send them
    here in one shot.
    """

    state_ids: list[int] = []
    district_ids: list[int] = []
    location_ids: list[int] = []


class LocationLabelsResponse(BaseModel):
    """
    Id -> name maps for whichever ids were requested. Missing/unmatched
    ids are simply absent from the relevant map rather than erroring.
    """

    states: dict[int, str] = {}
    districts: dict[int, str] = {}
    locations: dict[int, str] = {}