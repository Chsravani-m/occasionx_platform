from uuid import UUID
from datetime import date
from datetime import datetime
from datetime import time

from pydantic import BaseModel


class BookingCreate(BaseModel):

    customer_id: UUID

    provider_id: UUID

    service_id: UUID

    pricing_id: UUID

    event_date: date

    # Required for online bookings - the provider's own
    # booking_notice_hours is checked against event_date + event_time,
    # not just the date (see app/core/booking_rules.py).
    event_time: time

    event_end_date: date | None = None

    quantity: int | None = None

    guest_count: int | None = None

    notes: str | None = None

    customer_name: str | None = None

    customer_email: str | None = None

    customer_phone: str | None = None

    provider_name: str | None = None

    service_name: str | None = None

    package_name: str | None = None

    category_name: str | None = None

    amount: float | None = None


class BookingStatusUpdate(BaseModel):

    booking_status: str


class OfflineBookingCreate(BaseModel):
    """
    A booking a provider logs for a job they did outside OccasionX -
    fully free-form, not tied to any real customer/service/pricing
    row. Used purely for the provider's own record-keeping, calendar
    and bill printing.
    """

    customer_name: str

    customer_phone: str

    customer_email: str | None = None

    # Free-text description of what was done (there's no real
    # service_id to point at).
    service_name: str

    # The date the job/event happened.
    event_date: date

    event_end_date: date | None = None

    # The date the provider actually got paid, if different.
    payment_date: date | None = None

    amount: float

    # How the provider was paid (Cash, UPI, Card, Bank Transfer,
    # Cheque, Other) - free text from a fixed frontend list.
    payment_method: str | None = None

    # "FULL" or "ADVANCE". Defaults to "FULL" (and amount_paid to the
    # full amount) if not given - most offline jobs are paid in full.
    payment_type: str | None = None

    # How much has actually been collected so far. Required to make
    # sense when payment_type is "ADVANCE"; defaults to the full
    # amount otherwise.
    amount_paid: float | None = None

    guest_count: int | None = None

    notes: str | None = None


class BookingStatsResponse(BaseModel):

    total_bookings: int

    pending_bookings: int

    confirmed_bookings: int

    rejected_bookings: int

    total_revenue: float


class BookingResponse(BaseModel):

    id: UUID

    customer_id: UUID | None = None

    provider_id: UUID

    service_id: UUID | None = None

    pricing_id: UUID | None = None

    event_date: date

    event_time: time | None = None

    event_end_date: date | None = None

    quantity: int | None = None

    guest_count: int | None

    notes: str | None

    booking_status: str

    created_at: datetime

    customer_name: str | None = None

    customer_email: str | None = None

    customer_phone: str | None = None

    provider_name: str | None = None

    service_name: str | None = None

    package_name: str | None = None

    category_name: str | None = None

    amount: float | None = None

    source: str | None = None

    payment_date: date | None = None

    payment_method: str | None = None

    payment_type: str | None = None

    amount_paid: float | None = None

    application_fee: float | None = None

    class Config:
        from_attributes = True


class PaginatedBookingsResponse(BaseModel):

    items: list[BookingResponse]

    total: int

    page: int

    page_size: int

    total_pages: int


class MonthlyEarnings(BaseModel):

    month: str

    earnings: float

    bookings: int


class ProviderEarningsResponse(BaseModel):
    """
    OccasionX takes no commission and doesn't hold or pay out provider
    funds - this is purely a read-only view of a provider's own
    booking revenue, for their own reference. No payout workflow.
    """

    total_earnings: float

    confirmed_bookings: int

    average_booking_value: float

    awaiting_payment_amount: float

    awaiting_payment_count: int

    offline_earnings: float

    offline_bookings: int

    monthly: list[MonthlyEarnings]