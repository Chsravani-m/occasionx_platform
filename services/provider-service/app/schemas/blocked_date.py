from uuid import UUID
from datetime import date

from pydantic import BaseModel


class BlockedDateCreate(BaseModel):

    blocked_from: date

    blocked_to: date

    reason: str | None = None


class BlockedDateResponse(BaseModel):

    id: UUID

    service_id: UUID

    blocked_from: date

    blocked_to: date

    reason: str | None = None

    class Config:
        from_attributes = True


class BlockedDateUpdate(BaseModel):

    blocked_from: date | None = None

    blocked_to: date | None = None

    reason: str | None = None