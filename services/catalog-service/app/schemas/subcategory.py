from uuid import UUID
from pydantic import BaseModel


class SubCategoryResponse(BaseModel):
    id: UUID
    category_id: UUID
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class SubCategoryCreateRequest(BaseModel):
    name: str
    description: str | None = None


class SubCategoryUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
