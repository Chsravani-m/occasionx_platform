from uuid import UUID
from datetime import datetime

from pydantic import BaseModel
from pydantic import field_validator


class ReviewCreate(BaseModel):

    booking_id: UUID

    customer_id: UUID

    rating: int

    comment: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, value: int) -> int:
        if value < 1 or value > 5:
            raise ValueError("Rating must be between 1 and 5.")
        return value


class ReviewStats(BaseModel):

    total_reviews: int

    average_rating: float


class ReviewResponse(BaseModel):

    id: UUID

    booking_id: UUID

    customer_id: UUID

    provider_id: UUID

    service_id: UUID | None = None

    rating: int

    comment: str | None = None

    customer_name: str | None = None

    service_name: str | None = None

    created_at: datetime

    class Config:
        from_attributes = True
