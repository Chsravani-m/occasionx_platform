from uuid import UUID
from pydantic import BaseModel


class PackageCategoryRequest(BaseModel):
    category_id: UUID
    required: bool = True


class PackageCreateRequest(BaseModel):
    event_type_id: UUID

    name: str
    description: str | None = None

    min_budget: float
    max_budget: float

    tier: str = "STANDARD"

    categories: list[PackageCategoryRequest]


class PackageUpdateRequest(BaseModel):
    event_type_id: UUID

    name: str
    description: str | None = None

    min_budget: float
    max_budget: float

    active: bool

    tier: str = "STANDARD"

    categories: list[PackageCategoryRequest]


class PackageResponse(BaseModel):
    id: UUID

    event_type_id: UUID

    name: str
    description: str | None

    min_budget: float
    max_budget: float

    active: bool

    tier: str

    class Config:
        from_attributes = True