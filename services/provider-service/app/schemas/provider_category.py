from uuid import UUID

from pydantic import BaseModel


class ProviderCategoryItem(BaseModel):
    category_id: UUID
    subcategory_id: UUID | None = None


class ProviderCategoryCreate(BaseModel):
    categories: list[ProviderCategoryItem]


class ProviderCategoryResponse(BaseModel):
    id: UUID
    provider_id: UUID
    category_id: UUID
    subcategory_id: UUID | None = None

    class Config:
        from_attributes = True