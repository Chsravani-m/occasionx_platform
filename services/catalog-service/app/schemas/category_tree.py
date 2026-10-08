from uuid import UUID

from pydantic import BaseModel


class SubCategoryItem(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class CategoryWithSubcategories(BaseModel):
    id: UUID
    name: str

    subcategories: list[SubCategoryItem]

    class Config:
        from_attributes = True