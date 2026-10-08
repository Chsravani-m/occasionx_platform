import uuid

from sqlalchemy import Column

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class ProviderCategory(Base):
    __tablename__ = "provider_categories"

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

    category_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    subcategory_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )