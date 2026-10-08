import uuid

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import UniqueConstraint
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    __table_args__ = (
        UniqueConstraint(
            "customer_id",
            "provider_id",
            name="uq_wishlist_customer_provider"
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    customer_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    provider_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )
