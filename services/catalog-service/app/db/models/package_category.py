from sqlalchemy import Column, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
import uuid


class PackageCategory(Base):
    __tablename__ = "package_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    package_id = Column(
        UUID(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False
    )

    category_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    required = Column(Boolean, default=True)