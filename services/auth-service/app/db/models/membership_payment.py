import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Numeric
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class MembershipPayment(Base):
    """
    One-time "paid user" membership fee, paid either right after
    registration (checkbox on the register form) or later from the
    account. Kept separate from booking-service's Payment table since
    it isn't tied to a booking at all - it's tied to a user becoming
    a paid member.
    """

    __tablename__ = "membership_payments"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
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
