import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Enum
)

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base
from app.db.models.role import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    full_name = Column(
    String(255),
    nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    phone = Column(
        String(20),
        unique=True,
        nullable=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.CUSTOMER
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    is_verified = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    email_verification_token = Column(
        String,
        nullable=True
    )

    email_verified_at = Column(
        DateTime,
        nullable=True
    )
    
    is_phone_verified = Column(Boolean, default=False)

    # Paid membership: set True only after a successful membership
    # payment (see MembershipPayment). Every user starts False by
    # default - if they check "register as a paid user" but cancel or
    # fail the payment, they simply stay a free user, no extra
    # handling needed since this is the default anyway.
    is_paid_member = Column(
        Boolean,
        nullable=False,
        default=False
    )

