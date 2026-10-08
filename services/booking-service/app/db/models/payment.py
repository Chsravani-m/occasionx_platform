import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Numeric
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Payment(Base):
    __tablename__ = "payments"

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
