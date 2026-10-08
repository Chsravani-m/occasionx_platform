import uuid

from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class SubCategory(Base):
    __tablename__ = "subcategories"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=False
    )

    name = Column(
        String(150),
        nullable=False
    )

    description = Column(Text)

    category = relationship(
    "Category",
    back_populates="subcategories"
)