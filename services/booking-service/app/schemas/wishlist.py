from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class WishlistCreate(BaseModel):

    customer_id: UUID

    provider_id: UUID


class WishlistResponse(BaseModel):

    id: UUID

    customer_id: UUID

    provider_id: UUID

    created_at: datetime

    class Config:
        from_attributes = True
