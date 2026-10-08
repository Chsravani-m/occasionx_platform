from uuid import UUID

from pydantic import BaseModel, model_validator
from typing import Literal


QUANTITY_CAP_REQUIRED_TYPES = (
    "PER_PERSON",
    "PER_PLATE",
)

MAX_OCCUPANCY_PER_ROOM = 4


class PricingCreate(BaseModel):

    pricing_type: Literal[
            "FIXED",
            "HOURLY",
            "PACKAGE",
            "PER_PERSON",
            "PER_PLATE",
            "PER_DAY",
            "CUSTOM"
        ]

    amount: float

    currency: str = "INR"

    unit: str | None = None

    min_quantity: int | None = None

    max_quantity: int | None = None

    description: str | None = None

    # Only used for PER_DAY pricing on Accommodation-category services -
    # how many guests one room sleeps, used to auto-suggest room count.
    occupancy_per_room: int | None = None

    # Only used for PER_DAY pricing on Accommodation-category services -
    # total rooms/suites available at this pricing tier. When set,
    # multiple different customers can book the same date as long as
    # the rooms requested don't exceed this count.
    total_rooms: int | None = None

    @model_validator(mode="after")
    def require_max_quantity_for_per_unit_pricing(self):

        if (
            self.pricing_type in QUANTITY_CAP_REQUIRED_TYPES
            and self.max_quantity is None
        ):
            raise ValueError(
                "max_quantity is required for PER_PERSON and "
                "PER_PLATE pricing (e.g. the maximum number of "
                "guests this price covers)"
            )

        if (
            self.occupancy_per_room is not None
            and (
                self.occupancy_per_room < 1
                or self.occupancy_per_room > MAX_OCCUPANCY_PER_ROOM
            )
        ):
            raise ValueError(
                f"Guests per Room must be between 1 and "
                f"{MAX_OCCUPANCY_PER_ROOM}"
            )

        if self.total_rooms is not None and self.total_rooms < 1:
            raise ValueError(
                "Total Rooms/Suites must be at least 1"
            )

        return self

class PricingResponse(BaseModel):

    id: UUID

    service_id: UUID

    pricing_type: str

    amount: float

    currency: str

    unit: str | None = None

    min_quantity: int | None = None

    max_quantity: int | None = None

    description: str | None = None

    occupancy_per_room: int | None = None

    total_rooms: int | None = None

    class Config:
        from_attributes = True

class PricingUpdate(BaseModel):

    pricing_type: str | None = None

    amount: float | None = None

    currency: str | None = None

    occupancy_per_room: int | None = None

    total_rooms: int | None = None

    @model_validator(mode="after")
    def validate_occupancy_per_room(self):

        if (
            self.occupancy_per_room is not None
            and (
                self.occupancy_per_room < 1
                or self.occupancy_per_room > MAX_OCCUPANCY_PER_ROOM
            )
        ):
            raise ValueError(
                f"Guests per Room must be between 1 and "
                f"{MAX_OCCUPANCY_PER_ROOM}"
            )

        if self.total_rooms is not None and self.total_rooms < 1:
            raise ValueError(
                "Total Rooms/Suites must be at least 1"
            )

        return self