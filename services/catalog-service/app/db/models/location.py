from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import ForeignKey
from sqlalchemy import UniqueConstraint

from app.db.database import Base


class Location(Base):
    __tablename__ = "locations"

    __table_args__ = (
        UniqueConstraint(
            "district_id",
            "name",
            name="uq_district_location"
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    district_id = Column(
        Integer,
        ForeignKey("districts.id"),
        nullable=False
    )

    name = Column(
        String(100),
        nullable=False
    )