import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Numeric
from sqlalchemy import Integer
from sqlalchemy import ForeignKey

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Pricing(Base):
    __tablename__ = "service_pricing"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    service_id = Column(
        UUID(as_uuid=True),
        ForeignKey("provider_services.id"),
        nullable=False
    )

    pricing_type = Column(
    String(50),
    nullable=False
    )

    amount = Column(
        Numeric(10, 2),
        nullable=False
    )

    unit = Column(
        String(50),
        nullable=True
    )

    min_quantity = Column(
        Numeric(10, 2),
        nullable=True
    )

    max_quantity = Column(
        Numeric(10, 2),
        nullable=True
    )

    description = Column(
        String(500),
        nullable=True
    )

    currency = Column(
        String(10),
        default="INR"
    )

    # Only meaningful for PER_DAY pricing on Accommodation-category
    # services - how many guests one room/unit sleeps, used to
    # auto-suggest the number of rooms a booking needs.
    occupancy_per_room = Column(
        Integer,
        nullable=True
    )

    # Only meaningful for PER_DAY pricing on Accommodation-category
    # services - total rooms/suites the provider has for this pricing
    # tier. When set, booking-service allows multiple different
    # customers to book the same date as long as the rooms requested
    # don't exceed this count, instead of the first booking blocking
    # the whole date for everyone else.
    total_rooms = Column(
        Integer,
        nullable=True
    )