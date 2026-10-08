import uuid

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Numeric,
    Boolean,
    ForeignKey
)

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class ProviderSubscription(Base):

    __tablename__ = "provider_subscriptions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    provider_id = Column(
        UUID(as_uuid=True),
        ForeignKey("providers.id"),
        nullable=False
    )

    plan_name = Column(
        String(50),
        nullable=False
    )

    amount = Column(
        Numeric(10, 2),
        nullable=False
    )

    payment_status = Column(
        String(30),
        default="PENDING"
    )

    razorpay_order_id = Column(
        String(255),
        nullable=True
    )

    razorpay_payment_id = Column(
        String(255),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=False
    )

    start_date = Column(
        DateTime,
        nullable=True
    )

    end_date = Column(
        DateTime,
        nullable=True
    )