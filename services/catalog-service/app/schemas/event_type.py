from uuid import UUID
from pydantic import BaseModel


class EventTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    is_inbuilt: bool = False

    class Config:
        from_attributes = True


class EventTypeCreateRequest(BaseModel):
    name: str
    description: str | None = None
    is_inbuilt: bool = False


class EventTypeUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    is_inbuilt: bool | None = None