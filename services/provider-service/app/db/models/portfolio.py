import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import ForeignKey

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Portfolio(Base):
    __tablename__ = "provider_portfolios"

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

    media_type = Column(
        String(20),
        nullable=False
    )

    media_url = Column(
        String(500),
        nullable=False
    )

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )