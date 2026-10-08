import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import ForeignKey

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Service(Base):
    __tablename__ = "provider_services"

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

    name = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    # Category-specific spec/checklist fields the provider fills in on
    # the dashboard (e.g. Venue -> Indoor Capacity/Amenities, Catering
    # -> Cuisine/Per Plate pricing). Which fields apply is decided
    # client-side from the category name (see
    # frontend/web-app/src/utils/serviceAttributesSchema.ts) - this
    # column just stores whatever flat key/value map that form
    # produces, JSON-encoded as Text (this codebase's existing
    # convention for list/dict fields - see Provider.languages_spoken).
    attributes = Column(
        Text,
        nullable=True
    )