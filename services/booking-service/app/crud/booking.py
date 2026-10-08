import os
from uuid import UUID
from datetime import datetime, timedelta

import requests

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.booking import Booking

from app.schemas.booking import (
    BookingCreate,
    OfflineBookingCreate,
)

from app.crud.notification import create_notification
from app.provider_client import (
    get_provider_user_id,
    get_provider_phone,
    get_provider_services,
)
from app.whatsapp_utils import (
    send_booking_confirmation_customer_whatsapp,
    send_booking_confirmation_provider_whatsapp,
)

PROVIDER_SERVICE_URL = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")

# How long a booking can sit AWAITING_PAYMENT before its date hold is
# released automatically. Keeps an abandoned Razorpay checkout from
# blocking the date forever.
PAYMENT_EXPIRY_MINUTES = 30


def _auto_block_service_date(booking: Booking):
    """
    Blocks the service off for the full event date range (event_date
    through event_end_date, or just event_date for single-day bookings)
    as soon as a booking is created, so it can't be double-booked while
    payment is pending.

    Non-fatal: if provider-service is unreachable, the booking still
    goes through - the provider can always block the date manually from
    /provider/blocked_dates afterwards. Returns the new blocked-date id
    (as a string) so it can be released later if the booking is
    rejected or the payment window expires, or None if the call failed.
    """

    blocked_to = booking.event_end_date or booking.event_date

    try:
        response = requests.post(
            f"{PROVIDER_SERVICE_URL}/providers/services/"
            f"{booking.service_id}/blocked-dates",
            json={
                "blocked_from": str(booking.event_date),
                "blocked_to": str(blocked_to),
                "reason": (
                    f"Booked - {booking.customer_name or 'Customer'}"
                ),
            },
            timeout=5,
        )

        response.raise_for_status()

        return response.json().get("id")

    except Exception as e:
        print(
            "Warning: failed to auto-block date for booking "
            f"{booking.id}: {e}"
        )
        return None


def _release_blocked_date(booking: Booking):
    """
    Releases the date hold created by _auto_block_service_date, e.g.
    when a booking is rejected or its payment window expires without
    payment. Non-fatal - if provider-service can't be reached the
    provider can still delete the stale block manually.
    """

    if not booking.blocked_date_id:
        return

    try:
        requests.delete(
            f"{PROVIDER_SERVICE_URL}/providers/blocked-dates/"
            f"{booking.blocked_date_id}",
            timeout=5,
        )
    except Exception as e:
        print(
            "Warning: failed to release blocked date for booking "
            f"{booking.id}: {e}"
        )


def _auto_block_all_services_date(booking: Booking):
    """
    Offline bookings aren't tied to one real service_id, so instead of
    blocking a single service (_auto_block_service_date), this blocks
    the same date range across every service the provider offers -
    otherwise an online customer could still book a *different*
    listed service of theirs for a day they're already working
    offline. Non-fatal, same as _auto_block_service_date. Returns a
    comma-separated string of the created blocked-date ids (or None if
    none could be created), stored on offline_blocked_date_ids so they
    can all be released together later.
    """

    services = get_provider_services(booking.provider_id)

    if not services:
        return None

    blocked_to = booking.event_end_date or booking.event_date

    created_ids = []

    for service in services:
        service_id = service.get("id")

        if not service_id:
            continue

        try:
            response = requests.post(
                f"{PROVIDER_SERVICE_URL}/providers/services/"
                f"{service_id}/blocked-dates",
                json={
                    "blocked_from": str(booking.event_date),
                    "blocked_to": str(blocked_to),
                    "reason": (
                        "Offline booking - "
                        f"{booking.customer_name or 'Customer'}"
                    ),
                },
                timeout=5,
            )

            response.raise_for_status()

            created_id = response.json().get("id")

            if created_id:
                created_ids.append(str(created_id))

        except Exception as e:
            print(
                "Warning: failed to block date on service "
                f"{service_id} for offline booking {booking.id}: {e}"
            )

    return ",".join(created_ids) if created_ids else None


def _release_offline_blocked_dates(booking: Booking):
    """
    Counterpart to _auto_block_all_services_date - releases every
    blocked-date row it created, e.g. when the provider cancels an
    offline booking. Non-fatal per id.
    """

    if not booking.offline_blocked_date_ids:
        return

    for blocked_id in booking.offline_blocked_date_ids.split(","):
        blocked_id = blocked_id.strip()

        if not blocked_id:
            continue

        try:
            requests.delete(
                f"{PROVIDER_SERVICE_URL}/providers/blocked-dates/"
                f"{blocked_id}",
                timeout=5,
            )
        except Exception as e:
            print(
                "Warning: failed to release offline blocked date "
                f"{blocked_id} for booking {booking.id}: {e}"
            )


def _auto_reject_conflicting_pending(
    db: Session,
    booking: Booking
):
    """
    Once a booking for a service+date is confirmed, any other PENDING
    requests for that same service on the same date can no longer be
    honored - reject them automatically so the provider doesn't
    accidentally try to confirm a double-booking, and the customer
    sees an accurate status instead of a stale PENDING.
    """

    range_end = booking.event_end_date or booking.event_date

    conflicting = (
        db.query(Booking)
        .filter(
            Booking.service_id == booking.service_id,
            Booking.event_date <= range_end,
            func.coalesce(
                Booking.event_end_date, Booking.event_date
            ) >= booking.event_date,
            Booking.booking_status == "PENDING",
            Booking.id != booking.id,
        )
        .all()
    )

    for other in conflicting:
        other.booking_status = "REJECTED"

        note = (
            "Automatically rejected - this date was booked by "
            "another customer."
        )

        other.notes = (
            f"{other.notes.strip()} ({note})"
            if other.notes
            else note
        )

    if conflicting:
        db.commit()

        for other in conflicting:
            create_notification(
                db,
                user_id=other.customer_id,
                title="Booking request rejected",
                message=(
                    f"Your request for {other.service_name or 'this service'} "
                    f"on {other.event_date} could not be honored - the "
                    "date was booked by another customer."
                ),
                booking_id=other.id,
            )


def has_conflicting_request(
    db: Session,
    customer_id,
    service_id,
    event_date,
    event_end_date=None
) -> bool:
    """
    Stops the same customer from submitting a second request for the
    same service on an overlapping date range while one is already
    pending or confirmed.
    """

    range_end = event_end_date or event_date

    existing = (
        db.query(Booking)
        .filter(
            Booking.customer_id == customer_id,
            Booking.service_id == service_id,
            Booking.event_date <= range_end,
            func.coalesce(
                Booking.event_end_date, Booking.event_date
            ) >= event_date,
            Booking.booking_status.in_(
                ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"]
            ),
        )
        .first()
    )

    return existing is not None


def get_booked_quantity(
    db: Session,
    service_id,
    event_date,
    event_end_date=None
) -> int:
    """
    Sums up how many rooms/units are already booked for this service
    on dates overlapping the given range, across all still-active
    bookings (PENDING, AWAITING_PAYMENT, CONFIRMED). Used for
    room-inventory (total_rooms) pricing tiers, where multiple
    different customers can book the same date as long as the total
    requested doesn't exceed the provider's room count.
    """

    range_end = event_end_date or event_date

    overlapping = (
        db.query(Booking)
        .filter(
            Booking.service_id == service_id,
            Booking.event_date <= range_end,
            func.coalesce(
                Booking.event_end_date, Booking.event_date
            ) >= event_date,
            Booking.booking_status.in_(
                ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"]
            ),
        )
        .all()
    )

    return sum((b.quantity or 1) for b in overlapping)


def is_service_date_blocked(
    service_id,
    event_date,
    event_end_date=None
) -> bool:
    """
    Checks provider-service for blocked dates on this service that
    overlap the requested event_date -> event_end_date range. Fails
    open (returns False) if provider-service can't be reached, so a
    temporary outage there doesn't stop customers from booking.
    """

    range_end = str(event_end_date or event_date)

    try:
        response = requests.get(
            f"{PROVIDER_SERVICE_URL}/providers/services/"
            f"{service_id}/blocked-dates",
            timeout=5,
        )

        response.raise_for_status()

        for entry in response.json():
            if (
                str(entry["blocked_from"])
                <= range_end
                and str(event_date)
                <= str(entry["blocked_to"])
            ):
                return True

        return False

    except Exception as e:
        print(
            "Warning: failed to check blocked dates for service "
            f"{service_id}: {e}"
        )
        return False


def create_booking(
    db: Session,
    booking: BookingCreate,
    skip_date_block: bool = False
):
    """
    Bookings go straight to payment now - there's no provider
    acceptance step blocking checkout. As soon as the request is
    created it's AWAITING_PAYMENT, the date is blocked for this
    service, and any other PENDING/legacy requests for the same
    date are auto-rejected (first customer to pay wins the slot).

    skip_date_block=True is used for room-inventory (total_rooms)
    pricing tiers, where multiple different customers are meant to
    coexist on the same date - blocking the whole service off or
    auto-rejecting other pending requests would defeat the purpose.
    The capacity check itself already happened in the API layer
    before this was called.
    """

    data = booking.model_dump()

    db_booking = Booking(
        **data,
        booking_status="AWAITING_PAYMENT",
    )

    db.add(db_booking)

    db.commit()

    db.refresh(db_booking)

    if not skip_date_block:
        blocked_date_id = _auto_block_service_date(db_booking)

        if blocked_date_id:
            db_booking.blocked_date_id = blocked_date_id
            db.commit()
            db.refresh(db_booking)

        _auto_reject_conflicting_pending(db, db_booking)

    provider_user_id = get_provider_user_id(
        db_booking.provider_id
    )

    if provider_user_id:
        create_notification(
            db,
            user_id=provider_user_id,
            title="New booking - payment pending",
            message=(
                f"{db_booking.customer_name or 'A customer'} "
                f"requested {db_booking.service_name or 'a service'} "
                f"for {db_booking.event_date} and is completing "
                "payment."
            ),
            booking_id=db_booking.id,
        )

    return db_booking


def create_offline_booking(
    db: Session,
    provider_id: UUID,
    payload: OfflineBookingCreate
):
    """
    Lets a provider log a job they did outside OccasionX - for their
    own record-keeping/calendar/bill printing. Goes straight to
    CONFIRMED (there's no payment to collect through the platform)
    and blocks the date across all of the provider's listed services
    so it can't be double-booked online either.
    """

    data = payload.model_dump()

    # Most offline jobs are paid in full - default payment_type to
    # FULL and amount_paid to the total amount when the provider
    # doesn't say otherwise. An explicit ADVANCE with no amount_paid
    # is left as-is (nullable) rather than guessed.
    if not data.get("payment_type"):
        data["payment_type"] = "FULL"

    if data.get("amount_paid") is None and data["payment_type"] == "FULL":
        data["amount_paid"] = data["amount"]

    db_booking = Booking(
        **data,
        provider_id=provider_id,
        booking_status="CONFIRMED",
        source="OFFLINE",
        quantity=1,
    )

    db.add(db_booking)

    db.commit()

    db.refresh(db_booking)

    blocked_ids = _auto_block_all_services_date(db_booking)

    if blocked_ids:
        db_booking.offline_blocked_date_ids = blocked_ids
        db.commit()
        db.refresh(db_booking)

    return db_booking


def expire_stale_bookings(db: Session):
    """
    Releases the date hold on any booking that's been sitting
    AWAITING_PAYMENT for longer than PAYMENT_EXPIRY_MINUTES without the
    customer completing checkout - covers an abandoned Razorpay popup,
    a closed tab, etc. Called lazily (at the top of the read/create
    paths below) rather than on a schedule, since this app has no
    background job runner.
    """

    cutoff = (
        datetime.utcnow()
        - timedelta(minutes=PAYMENT_EXPIRY_MINUTES)
    )

    stale = (
        db.query(Booking)
        .filter(
            Booking.booking_status == "AWAITING_PAYMENT",
            Booking.created_at < cutoff,
        )
        .all()
    )

    for booking in stale:

        _release_blocked_date(booking)

        booking.booking_status = "EXPIRED"

        note = (
            "Automatically expired - payment wasn't completed within "
            f"{PAYMENT_EXPIRY_MINUTES} minutes."
        )

        booking.notes = (
            f"{booking.notes.strip()} ({note})"
            if booking.notes
            else note
        )

    if stale:
        db.commit()

        for booking in stale:
            create_notification(
                db,
                user_id=booking.customer_id,
                title="Booking expired - payment not completed",
                message=(
                    f"Your booking for "
                    f"{booking.service_name or 'this service'} on "
                    f"{booking.event_date} expired because payment "
                    "wasn't completed in time. Please book again if "
                    "you still want this date."
                ),
                booking_id=booking.id,
            )


def get_customer_bookings(
    db: Session,
    customer_id: UUID
):
    expire_stale_bookings(db)

    return (
        db.query(Booking)
        .filter(
            Booking.customer_id
            == customer_id
        )
        .order_by(
            Booking.created_at.desc()
        )
        .all()
    )


def get_all_bookings(
    db: Session,
    limit: int | None = None
):
    expire_stale_bookings(db)

    # Admin's platform-wide list - offline bookings are a provider's
    # own record-keeping and aren't shown here (they still show up in
    # get_provider_bookings/get_provider_bookings_paginated).
    query = (
        db.query(Booking)
        .filter(Booking.source != "OFFLINE")
        .order_by(
            Booking.created_at.desc()
        )
    )

    if limit:
        query = query.limit(limit)

    return query.all()


def get_booking_stats(
    db: Session
):
    # Offline bookings are a provider's own record-keeping for jobs
    # OccasionX had no part in - they're excluded from these
    # platform-wide admin stats (but still count toward the
    # provider's own numbers via get_provider_bookings*).
    platform_only = Booking.source != "OFFLINE"

    total = (
        db.query(Booking)
        .filter(platform_only)
        .count()
    )

    pending = (
        db.query(Booking)
        .filter(
            Booking.booking_status == "PENDING",
            platform_only,
        )
        .count()
    )

    confirmed = (
        db.query(Booking)
        .filter(
            Booking.booking_status == "CONFIRMED",
            platform_only,
        )
        .count()
    )

    rejected = (
        db.query(Booking)
        .filter(
            Booking.booking_status == "REJECTED",
            platform_only,
        )
        .count()
    )

    total_revenue = (
        db.query(
            func.coalesce(
                func.sum(Booking.amount),
                0
            )
        )
        .filter(
            Booking.booking_status == "CONFIRMED",
            platform_only,
        )
        .scalar()
    )

    return {
        "total_bookings": total,
        "pending_bookings": pending,
        "confirmed_bookings": confirmed,
        "rejected_bookings": rejected,
        "total_revenue": float(total_revenue or 0),
    }


def get_provider_bookings(
    db: Session,
    provider_id: UUID
):

    expire_stale_bookings(db)

    return (
        db.query(Booking)
        .filter(
            Booking.provider_id == provider_id
        )
        .order_by(
            Booking.created_at.desc()
        )
        .all()
    )


def get_provider_bookings_paginated(
    db: Session,
    provider_id: UUID,
    page: int = 1,
    page_size: int = 10
):
    expire_stale_bookings(db)

    page = max(page, 1)
    page_size = max(min(page_size, 100), 1)

    base_query = db.query(Booking).filter(
        Booking.provider_id == provider_id
    )

    total = base_query.count()

    items = (
        base_query.order_by(Booking.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = max((total + page_size - 1) // page_size, 1)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def get_provider_earnings(
    db: Session,
    provider_id: UUID
):
    """
    OccasionX takes no commission and never holds or pays out
    provider funds - customers pay providers directly, so this is
    purely a read-only revenue summary built off the provider's own
    booking history for their own reference. No payout workflow.
    """

    confirmed_online = (
        db.query(Booking)
        .filter(
            Booking.provider_id == provider_id,
            Booking.booking_status == "CONFIRMED",
            Booking.source != "OFFLINE",
        )
        .all()
    )

    total_earnings = sum(
        float(b.amount or 0) for b in confirmed_online
    )

    confirmed_bookings = len(confirmed_online)

    average_booking_value = (
        round(total_earnings / confirmed_bookings, 2)
        if confirmed_bookings
        else 0.0
    )

    awaiting = (
        db.query(Booking)
        .filter(
            Booking.provider_id == provider_id,
            Booking.booking_status == "AWAITING_PAYMENT",
            Booking.source != "OFFLINE",
        )
        .all()
    )

    awaiting_payment_amount = sum(
        float(b.amount or 0) for b in awaiting
    )

    awaiting_payment_count = len(awaiting)

    offline_confirmed = (
        db.query(Booking)
        .filter(
            Booking.provider_id == provider_id,
            Booking.booking_status == "CONFIRMED",
            Booking.source == "OFFLINE",
        )
        .all()
    )

    offline_earnings = sum(
        float(b.amount or 0) for b in offline_confirmed
    )

    offline_bookings = len(offline_confirmed)

    # Last 6 months (oldest -> newest, including the current month) so
    # the provider can see a simple earnings trend without needing a
    # charting library on the frontend.
    now = datetime.utcnow()

    months = []

    for i in range(5, -1, -1):
        year = now.year
        month = now.month - i

        while month <= 0:
            month += 12
            year -= 1

        months.append((year, month))

    monthly_totals = {
        key: {"earnings": 0.0, "bookings": 0} for key in months
    }

    for booking in confirmed_online:
        key = (
            booking.created_at.year,
            booking.created_at.month,
        )

        if key in monthly_totals:
            monthly_totals[key]["earnings"] += float(
                booking.amount or 0
            )
            monthly_totals[key]["bookings"] += 1

    monthly = [
        {
            "month": f"{year:04d}-{month:02d}",
            "earnings": round(
                monthly_totals[(year, month)]["earnings"], 2
            ),
            "bookings": monthly_totals[(year, month)]["bookings"],
        }
        for year, month in months
    ]

    return {
        "total_earnings": round(total_earnings, 2),
        "confirmed_bookings": confirmed_bookings,
        "average_booking_value": average_booking_value,
        "awaiting_payment_amount": round(
            awaiting_payment_amount, 2
        ),
        "awaiting_payment_count": awaiting_payment_count,
        "offline_earnings": round(offline_earnings, 2),
        "offline_bookings": offline_bookings,
        "monthly": monthly,
    }


def get_booking_by_id(
    db: Session,
    booking_id: UUID
):
    return (
        db.query(Booking)
        .filter(
            Booking.id == booking_id
        )
        .first()
    )


def update_booking_status(
    db: Session,
    booking_id: UUID,
    status: str
):
    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id
        )
        .first()
    )

    if not booking:
        return None

    previous_status = booking.booking_status

    booking.booking_status = status

    db.commit()

    db.refresh(booking)

    if status != previous_status:

        if status == "AWAITING_PAYMENT":
            create_notification(
                db,
                user_id=booking.customer_id,
                title="Booking accepted - payment required",
                message=(
                    f"Your booking for "
                    f"{booking.service_name or 'this service'} on "
                    f"{booking.event_date} was accepted. Complete "
                    "payment to confirm your slot."
                ),
                booking_id=booking.id,
            )

            if not booking.blocked_date_id:
                blocked_date_id = _auto_block_service_date(booking)

                if blocked_date_id:
                    booking.blocked_date_id = blocked_date_id
                    db.commit()
                    db.refresh(booking)

            _auto_reject_conflicting_pending(db, booking)

        elif status == "REJECTED":

            # Release the date hold - the provider is declining before
            # payment (or cancelling an offline entry), so this date
            # is available again for others.
            _release_blocked_date(booking)
            _release_offline_blocked_dates(booking)

            booking.blocked_date_id = None
            booking.offline_blocked_date_ids = None

            db.commit()
            db.refresh(booking)

            # Offline bookings have no real customer_id to notify.
            if booking.source != "OFFLINE" and booking.customer_id:
                create_notification(
                    db,
                    user_id=booking.customer_id,
                    title="Booking rejected",
                    message=(
                        f"Your booking request for "
                        f"{booking.service_name or 'this service'} on "
                        f"{booking.event_date} was rejected by the "
                        "provider."
                    ),
                    booking_id=booking.id,
                )

    return booking


def cancel_booking(
    db: Session,
    booking_id: UUID
):
    """
    Customer-initiated cancellation (as opposed to a provider's
    REJECTED, which happens before payment). Only meaningful for
    bookings that have actually reserved a date - AWAITING_PAYMENT or
    CONFIRMED - and only outside the category's cancellation cutoff
    (see app/core/booking_rules.py); both checks are enforced by the
    caller (app/api/booking.py) before this is called, since they need
    to return specific error messages. This just performs the state
    change and cleanup once those checks have passed.
    """

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id
        )
        .first()
    )

    if not booking:
        return None

    _release_blocked_date(booking)
    _release_offline_blocked_dates(booking)

    booking.booking_status = "CANCELLED"
    booking.blocked_date_id = None
    booking.offline_blocked_date_ids = None

    db.commit()

    db.refresh(booking)

    provider_user_id = get_provider_user_id(booking.provider_id)

    if provider_user_id:
        create_notification(
            db,
            user_id=provider_user_id,
            title="Booking cancelled",
            message=(
                f"{booking.customer_name or 'The customer'} cancelled "
                f"their booking for "
                f"{booking.service_name or 'a service'} on "
                f"{booking.event_date}."
            ),
            booking_id=booking.id,
        )

    return booking


def confirm_booking_payment(
    db: Session,
    booking_id: UUID
):
    """
    Called once a Razorpay payment has been verified. Moves the
    booking from AWAITING_PAYMENT to CONFIRMED and notifies both
    sides. The date/conflict handling already happened when the
    provider accepted (AWAITING_PAYMENT) - this step only finalizes
    payment.
    """

    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        return None

    booking.booking_status = "CONFIRMED"

    db.commit()

    db.refresh(booking)

    create_notification(
        db,
        user_id=booking.customer_id,
        title="Payment successful - booking confirmed",
        message=(
            f"Your payment for "
            f"{booking.service_name or 'this service'} on "
            f"{booking.event_date} was received. Your booking is "
            "now confirmed."
        ),
        booking_id=booking.id,
    )

    provider_user_id = get_provider_user_id(booking.provider_id)

    if provider_user_id:
        create_notification(
            db,
            user_id=provider_user_id,
            title="Payment received",
            message=(
                f"Payment received for "
                f"{booking.service_name or 'a service'} on "
                f"{booking.event_date}. The booking is confirmed."
            ),
            booking_id=booking.id,
        )

    # WhatsApp confirmations for both sides - best-effort, never
    # allowed to fail this call since payment has already succeeded.
    # See app/whatsapp_utils.py: runs in test mode (console log only)
    # until a real WhatsApp Business API provider is configured.
    provider_phone = get_provider_phone(booking.provider_id)

    send_booking_confirmation_customer_whatsapp(
        customer_phone=booking.customer_phone,
        customer_name=booking.customer_name,
        provider_name=booking.provider_name,
        provider_phone=provider_phone,
        event_date=booking.event_date,
        amount=booking.amount,
    )

    send_booking_confirmation_provider_whatsapp(
        provider_phone=provider_phone,
        provider_name=booking.provider_name,
        customer_name=booking.customer_name,
        customer_phone=booking.customer_phone,
        event_date=booking.event_date,
    )

    return booking