import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Text

from sqlalchemy.dialects.postgresql import UUID

from datetime import datetime

from app.db.database import Base


class ProviderDocument(Base):
    __tablename__ = "provider_documents"

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

    document_type = Column(
        String(50),
        nullable=False
    )

    document_url = Column(
        String(500),
        nullable=False
    )

    verification_status = Column(
        String(50),
        default="PENDING"
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    verified_by = Column(
    UUID(as_uuid=True),
    nullable=True
    )

    verified_at = Column(
        DateTime,
        nullable=True
    )

    rejection_reason = Column(
        Text,
        nullable=True
    )