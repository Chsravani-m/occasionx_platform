from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import ForeignKey

from app.db.database import Base


class District(Base):
    __tablename__ = "districts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    state_id = Column(
        Integer,
        ForeignKey("states.id"),
        nullable=False
    )

    name = Column(
        String(100),
        nullable=False
    )