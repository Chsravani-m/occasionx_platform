import uuid

from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean
)

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id = Column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False
    )

    # Basic Info
    first_name = Column(String(100))
    last_name = Column(String(100))

    email = Column(
        String(255),
        unique=True
    )

    phone = Column(String(20))

    # Address
    address = Column(String(255))

    city = Column(String(100))

    state = Column(String(100))

    country = Column(String(100))

    pincode = Column(String(20))

    # Profile
    profile_image_url = Column(String(500))

    bio = Column(String(1000))

    # Status
    is_active = Column(
        Boolean,
        default=True
    )

    # Audit
    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )