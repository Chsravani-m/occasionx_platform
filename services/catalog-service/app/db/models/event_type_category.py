import uuid

from sqlalchemy import Column
from sqlalchemy import ForeignKey

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class EventTypeCategory(Base):
    __tablename__ = "event_type_categories"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    event_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("event_types.id"),
        nullable=False
    )

    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=False
    )