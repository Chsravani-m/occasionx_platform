import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Numeric
from sqlalchemy import DateTime
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class BookingCharge(Base):
    """
    The per-booking service charge free (non-paid-member) customers
    pay to confirm a booking. Deliberately separate from Payment -
    Payment is always tied to a specific booking_id, but this charge
    has to be collected *before* any booking exists (the customer
    pays it, then the booking + its own service-price payment proceed
    as normal). Not tied to a booking_id for that reason - customer_id
    is enough to know who paid it.
    """

    __tablename__ = "booking_charges"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    customer_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    razorpay_order_id = Column(
        String(100),
        nullable=False
    )

    razorpay_payment_id = Column(
        String(100),
        nullable=True
    )

    razorpay_signature = Column(
        String(255),
        nullable=True
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False
    )

    currency = Column(
        String(10),
        default="INR"
    )

    status = Column(
        String(50),
        default="CREATED"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
