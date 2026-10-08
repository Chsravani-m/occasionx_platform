from uuid import UUID
from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class CategoryCreateRequest(BaseModel):
    name: str
    description: str | None = None


class CategoryUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None