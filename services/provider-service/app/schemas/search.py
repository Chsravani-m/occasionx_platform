from pydantic import BaseModel
from uuid import UUID

class ProviderSearchResponse(BaseModel):
    id: UUID

    business_name: str
    owner_name: str

    state_id: int | None = None
    district_id: int | None = None
    location_id: int | None = None
    address: str | None = None
    verification_status: str

    category_id: UUID | None = None
    subcategory_id: UUID | None = None

    cover_image: str | None = None

    starting_price: float | None = None

    rating: float = 0
    review_count: int = 0

    # Category-specific spec fields (Amenities, Cuisine, etc.) from
    # whichever of the provider's services matches the searched
    # category/subcategory - see search_providers() in api/search.py,
    # which already decodes the JSON-encoded Service.attributes column
    # before building this dict, so this is always a plain dict here
    # (unlike ServiceResponse.attributes, no string-decode validator
    # is needed on this schema).
    attributes: dict = {}

    class Config:
        from_attributes = True