import uuid

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class EventType(Base):
    __tablename__ = "event_types"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name = Column(
        String(150),
        nullable=False,
        unique=True
    )

    description = Column(Text)

    # Marks one of the ~10 official "OX In-Built" package templates
    # (Wedding, Engagement, Reception, Birthday, Baby Shower, Naming
    # Ceremony, Housewarming, Corporate Event, Festival, Religious
    # Ceremony) as opposed to the long tail of other event types
    # admins can freely add. Used to badge/filter these in the admin
    # UI and, later, to give them a dedicated customer-facing surface.
    is_inbuilt = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false"
    )