import uuid

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import UniqueConstraint
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Review(Base):
    __tablename__ = "reviews"

    # One review per booking - a customer rates the specific job that
    # happened, not the provider in the abstract.
    __table_args__ = (
        UniqueConstraint(
            "booking_id",
            name="uq_review_booking"
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    booking_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id"),
        nullable=False
    )

    customer_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    provider_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    service_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    rating = Column(
        Integer,
        nullable=False
    )

    comment = Column(
        Text,
        nullable=True
    )

    # Denormalized at write time (same pattern as Booking's
    # customer_name/service_name) so the provider-facing and public
    # review lists don't need a join back to customer/booking data.
    customer_name = Column(String)
    service_name = Column(String)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
