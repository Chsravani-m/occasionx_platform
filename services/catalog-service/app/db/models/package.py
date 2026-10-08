from sqlalchemy import Column, String, Text, Boolean, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
import uuid


class Package(Base):
    __tablename__ = "packages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String(255), nullable=False)

    description = Column(Text,nullable=True)

    event_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("event_types.id"),
        nullable=False
    )
    min_budget = Column(Numeric(12, 2), nullable=False)

    max_budget = Column(Numeric(12, 2), nullable=False)

    active = Column(Boolean, default=True)

    # Admin-assigned pricing tier for the "OX In-Built Packages" tiered
    # display (Basic / Standard / Premium). Explicitly set by the admin
    # when creating/editing a package rather than inferred from price.
    tier = Column(
        String(20),
        nullable=False,
        default="STANDARD",
        server_default="STANDARD"
    )