from uuid import UUID
from pydantic import BaseModel
from enum import Enum


class MediaType(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    ZIP = "ZIP"
    
class PortfolioCreate(BaseModel):

    media_type: MediaType

    media_url: str

    title: str

    description: str | None = None


class PortfolioResponse(BaseModel):

    id: UUID

    provider_id: UUID

    media_type: MediaType

    media_url: str

    title: str

    description: str | None = None

    class Config:
        from_attributes = True