import uuid

from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Time
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Nullable because offline bookings (logged manually by a provider
    # for a job that happened outside OccasionX) have no real
    # customer/service/pricing rows to point at.
    customer_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    provider_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    service_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    pricing_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    event_date = Column(
        Date,
        nullable=False
    )

    event_end_date = Column(
        Date,
        nullable=True
    )

    # The event's start time (e.g. 12:00pm) - nullable so older rows
    # (and offline bookings, which are logged after the fact) don't
    # break, but required by the API for new online bookings so the
    # provider's own booking_notice_hours can be checked against the
    # real event date+time rather than just midnight of the event day
    # (see app/core/booking_rules.py).
    event_time = Column(
        Time,
        nullable=True
    )

    quantity = Column(
        Integer,
        nullable=True,
        default=1
    )

    guest_count = Column(
        Integer,
        nullable=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    booking_status = Column(
        String(50),
        default="PENDING"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    # id of the provider-service blocked-dates row created to hold this
    # date while payment is pending. Stored so it can be released again
    # if the booking gets rejected or the payment window expires.
    blocked_date_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    customer_name = Column(String)
    customer_email = Column(String)
    customer_phone = Column(String)

    provider_name = Column(String)
    service_name = Column(String)
    package_name = Column(String)

    # Top-level category name (e.g. "Accommodation", "Venue"), denormalized
    # at booking-creation time the same way provider_name/service_name are.
    # Needed so booking-service can apply category-dependent minimum-notice
    # and cancellation-cutoff rules without a cross-service call at read
    # time (see create_booking in crud/booking.py).
    category_name = Column(String)

    amount = Column(Numeric(12, 2))

    # "ONLINE" (default) = booked through OccasionX. "OFFLINE" = the
    # provider manually logged a job they did outside the platform, so
    # it doesn't count toward platform revenue/commission but still
    # shows on their own booking list, calendar and earnings.
    source = Column(
        String(20),
        nullable=False,
        default="ONLINE",
        server_default="ONLINE"
    )

    # When the provider says they were actually paid for an offline
    # job - separate from event_date (the date the service happened).
    payment_date = Column(
        Date,
        nullable=True
    )

    # Comma-separated blocked-date ids created across every one of the
    # provider's services when an offline booking is logged, so the
    # date can't be double-booked online either. Released the same way
    # _release_blocked_date releases the single-service blocked_date_id
    # above, just fanned out over every id in this list.
    offline_blocked_date_ids = Column(
        Text,
        nullable=True
    )

    # How the provider was paid for an offline job - free-text choice
    # from a fixed set on the frontend (Cash, UPI, Card, Bank Transfer,
    # Cheque, Other). Only meaningful for OFFLINE bookings.
    payment_method = Column(
        String(30),
        nullable=True
    )

    # "FULL" or "ADVANCE" - whether amount_paid covers the whole
    # amount or just a deposit. Only meaningful for OFFLINE bookings.
    payment_type = Column(
        String(20),
        nullable=True
    )

    # How much the provider has actually collected so far - equals
    # amount for a FULL payment, less than amount for an ADVANCE.
    amount_paid = Column(
        Numeric(12, 2),
        nullable=True
    )

    # This booking's own share of the OX application fee, set when a
    # combined order that folded the fee in gets created (see
    # crud/payment.py create_combined_order) - BOOKING_CHARGE_AMOUNT
    # divided evenly across every booking in that same batch. Zero/NULL
    # for paid members (who never pay it) and for bookings whose
    # payment didn't include it. Stored per-booking, rather than only
    # on the shared BookingCharge row, so receipts can show it as its
    # own line item next to this booking's Service Provider Fee instead
    # of just a generic "a fee was included" note.
    application_fee = Column(
        Numeric(12, 2),
        nullable=True
    )