import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Integer
)

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class OTP(Base):
    __tablename__ = "otp_codes"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    email = Column(
        String(255),
        nullable=False,
        index=True
    )

    otp_code = Column(
        String(6),
        nullable=False
    )

    verified = Column(
        Boolean,
        default=False
    )

    attempts = Column(
        Integer,
        default=0
    )
    used = Column(
        Boolean,
        default=False
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )