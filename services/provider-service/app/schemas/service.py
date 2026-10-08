import json

from uuid import UUID

from pydantic import BaseModel, field_validator


class ServiceCreate(BaseModel):

    category_id: UUID

    subcategory_id: UUID | None = None

    name: str

    description: str | None = None

    # Flat key/value map of category-specific spec fields (Venue Type,
    # Indoor Capacity, Cuisine, etc.) - see ServiceResponse.attributes
    # below and the Service.attributes column comment for how this is
    # stored/decoded.
    attributes: dict | None = None


class ServiceUpdate(BaseModel):

    category_id: UUID | None = None

    subcategory_id: UUID | None = None

    name: str | None = None

    description: str | None = None

    attributes: dict | None = None


class ServiceResponse(BaseModel):

    id: UUID

    provider_id: UUID

    category_id: UUID

    subcategory_id: UUID | None = None

    name: str

    description: str | None = None

    attributes: dict = {}

    # Service.attributes is stored as a JSON-encoded Text column (see
    # the model comment), but callers of this response schema always
    # want a real dict - decode here so create/get/update all return
    # the same shape without every route handler doing it manually.
    @field_validator("attributes", mode="before")
    @classmethod
    def _decode_attributes(cls, value):
        if isinstance(value, str):
            if not value:
                return {}

            try:
                return json.loads(value)
            except (TypeError, ValueError):
                return {}

        return value or {}

    class Config:
        from_attributes = True