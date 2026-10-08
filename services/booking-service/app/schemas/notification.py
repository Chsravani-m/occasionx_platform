from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):

    id: UUID

    user_id: UUID

    title: str

    message: str | None = None

    booking_id: UUID | None = None

    is_read: bool

    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):

    unread_count: int
