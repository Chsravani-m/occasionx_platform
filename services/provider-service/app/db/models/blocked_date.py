import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Boolean
from sqlalchemy import Date
from sqlalchemy import ForeignKey

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class BlockedDate(Base):

    __tablename__ = "service_blocked_dates"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    service_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "provider_services.id"
        ),
        nullable=False
    )

    blocked_from = Column(
        Date,
        nullable=False
    )

    blocked_to = Column(
        Date,
        nullable=False
    )

    reason = Column(
        String(255),
        nullable=True
    )