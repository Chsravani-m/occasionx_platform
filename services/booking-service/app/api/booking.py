from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from app.core.booking_rules import (
    can_cancel_booking,
    earliest_allowed_datetime,
    latest_allowed_event_date
)

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingStatsResponse,
    BookingStatusUpdate,
    OfflineBookingCreate,
    PaginatedBookingsResponse,
    ProviderEarningsResponse
)

from app.crud.booking import (
    cancel_booking,
    create_booking,
    create_offline_booking,
    expire_stale_bookings,
    get_all_bookings,
    get_booked_quantity,
    get_booking_stats,
    get_booking_by_id,
    get_customer_bookings,
    get_provider_bookings,
    get_provider_bookings_paginated,
    get_provider_earnings,
    has_conflicting_request,
    is_service_date_blocked,
    update_booking_status
)

from app.provider_client import (
    get_pricing_details,
    get_provider_booking_policy,
    get_provider_user_id
)

from app.core.dependencies import (
    get_current_user,
    require_self_or_admin
)

from app.core.service_auth import is_admin

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


def _require_owning_provider_or_admin(
    provider_id,
    current_user: dict
):
    """
    Same idea as require_self_or_admin, but for provider-owned
    resources - a booking's provider_id is provider-service's Provider
    row id, not the auth 'sub' (user id), so it has to be resolved via
    provider-service first (see app/provider_client.py).
    """

    if is_admin(current_user):
        return

    owning_user_id = get_provider_user_id(provider_id)

    if (
        not owning_user_id
        or owning_user_id != current_user.get("sub")
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this provider's data"
        )


@router.post(
    "",
    response_model=BookingResponse
)
def create_booking_api(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    require_self_or_admin(
        booking.customer_id,
        current_user
    )

    # Release any stale AWAITING_PAYMENT holds first, so an abandoned
    # checkout on this date doesn't wrongly block this new request.
    expire_stale_bookings(db)

    if (
        booking.event_end_date
        and booking.event_end_date < booking.event_date
    ):
        raise HTTPException(
            status_code=400,
            detail="Check-out date can't be before the check-in date."
        )

    # Minimum lead time is now the owning provider's own setting
    # (booking_notice_hours, from their dashboard/app) rather than a
    # platform-wide category-tier day-based rule - checked against the
    # real event date+time so a same-day booking is allowed as long as
    # it clears the provider's required notice window. The 90-day
    # booking window is unchanged and still universal (OccasionX only
    # opens booking 3 months ahead, regardless of provider).
    now = datetime.now()
    today = date.today()

    policy = get_provider_booking_policy(booking.provider_id)
    notice_hours = policy.get("booking_notice_hours") if policy else None
    earliest_dt = earliest_allowed_datetime(notice_hours, now)
    latest = latest_allowed_event_date(today)

    event_dt = datetime.combine(booking.event_date, booking.event_time)

    if event_dt < earliest_dt:
        raise HTTPException(
            status_code=400,
            detail=(
                "This provider needs at least "
                f"{notice_hours if notice_hours is not None else 6} "
                "hour(s) notice for a booking. Earliest available "
                f"time is {earliest_dt.strftime('%Y-%m-%d %I:%M %p')}."
            )
        )

    if booking.event_date > latest:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Bookings can only be made up to {latest.isoformat()} "
                "(within 3 months)."
            )
        )

    # Room-inventory (total_rooms) pricing tiers let multiple different
    # customers book the same date, as long as the rooms requested
    # don't exceed the provider's room count - so those skip the usual
    # binary "first booking blocks the whole date" check below in
    # favor of a capacity check.
    pricing_details = get_pricing_details(booking.pricing_id)
    total_rooms = (
        pricing_details.get("total_rooms") if pricing_details else None
    )

    if total_rooms:
        requested_qty = booking.quantity or 1

        already_booked = get_booked_quantity(
            db,
            booking.service_id,
            booking.event_date,
            booking.event_end_date
        )

        remaining = total_rooms - already_booked

        if requested_qty > remaining:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Only {max(remaining, 0)} room(s) left for the "
                    "selected dates."
                )
            )

    else:
        if is_service_date_blocked(
            booking.service_id,
            booking.event_date,
            booking.event_end_date
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This provider is unavailable on the selected "
                    "date(s). Please choose different dates."
                )
            )

    if has_conflicting_request(
        db,
        booking.customer_id,
        booking.service_id,
        booking.event_date,
        booking.event_end_date
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "You already have a booking request for this "
                "service on this date."
            )
        )

    return create_booking(
        db,
        booking,
        skip_date_block=bool(total_rooms)
    )


@router.get(
    "",
    response_model=list[
        BookingResponse
    ]
)
def list_bookings(
    limit: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return get_all_bookings(
        db,
        limit
    )


@router.get(
    "/stats",
    response_model=BookingStatsResponse
)
def booking_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return get_booking_stats(db)


@router.get(
    "/customer/{customer_id}",
    response_model=list[
        BookingResponse
    ]
)
def customer_bookings(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    require_self_or_admin(
        customer_id,
        current_user
    )

    return get_customer_bookings(
        db,
        customer_id
    )


@router.get(
    "/provider/{provider_id}",
    response_model=list[
        BookingResponse
    ]
)
def provider_bookings(
    provider_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    _require_owning_provider_or_admin(
        provider_id,
        current_user
    )

    return get_provider_bookings(
        db,
        provider_id
    )


@router.get(
    "/provider/{provider_id}/paged",
    response_model=PaginatedBookingsResponse
)
def provider_bookings_paged(
    provider_id: UUID,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    _require_owning_provider_or_admin(
        provider_id,
        current_user
    )

    return get_provider_bookings_paginated(
        db,
        provider_id,
        page,
        page_size
    )


@router.get(
    "/provider/{provider_id}/earnings",
    response_model=ProviderEarningsResponse
)
def provider_earnings(
    provider_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    _require_owning_provider_or_admin(
        provider_id,
        current_user
    )

    return get_provider_earnings(
        db,
        provider_id
    )


@router.post(
    "/provider/{provider_id}/offline",
    response_model=BookingResponse
)
def create_offline_booking_api(
    provider_id: UUID,
    payload: OfflineBookingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    _require_owning_provider_or_admin(
        provider_id,
        current_user
    )

    if payload.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than zero."
        )

    if not payload.customer_phone.strip():
        raise HTTPException(
            status_code=400,
            detail="Customer phone number is required."
        )

    if (
        payload.event_end_date
        and payload.event_end_date < payload.event_date
    ):
        raise HTTPException(
            status_code=400,
            detail="Check-out date can't be before the check-in date."
        )

    if (
        payload.payment_type == "ADVANCE"
        and payload.amount_paid is not None
        and payload.amount_paid > payload.amount
    ):
        raise HTTPException(
            status_code=400,
            detail="Advance paid can't be more than the total amount."
        )

    return create_offline_booking(
        db,
        provider_id,
        payload
    )


@router.patch(
    "/{booking_id}/status",
    response_model=BookingResponse
)
def update_status(
    booking_id: UUID,
    request: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    existing = get_booking_by_id(db, booking_id)

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    _require_owning_provider_or_admin(
        existing.provider_id,
        current_user
    )

    if request.booking_status == "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Bookings can't be confirmed directly - accept the "
                "request (AWAITING_PAYMENT) and confirmation happens "
                "automatically once payment is verified."
            )
        )

    booking = update_booking_status(
        db,
        booking_id,
        request.booking_status
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    return booking


# Statuses that represent an actual reserved date worth cancelling.
# PENDING is unused in practice (bookings go straight to
# AWAITING_PAYMENT), but included defensively; REJECTED/CANCELLED/
# EXPIRED bookings never held the date (or no longer do) so there's
# nothing to cancel.
_CANCELLABLE_STATUSES = {"PENDING", "AWAITING_PAYMENT", "CONFIRMED"}


@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking_api(
    booking_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Customer-initiated cancellation. Only the booking's own customer
    (or an admin) can cancel, only while the booking is still
    PENDING/AWAITING_PAYMENT/CONFIRMED, and only before the event has
    already happened - beyond that, refund/cancellation terms are
    whatever the provider states in their own cancellation_policy
    (shown to the customer before they booked), not enforced here.
    No refund is processed automatically; that's handled outside the
    platform for now.
    """

    existing = get_booking_by_id(db, booking_id)

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    require_self_or_admin(
        existing.customer_id,
        current_user
    )

    if existing.booking_status not in _CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"A {existing.booking_status.lower()} booking can't "
                "be cancelled."
            )
        )

    if not can_cancel_booking(existing.event_date, existing.event_time):
        raise HTTPException(
            status_code=400,
            detail="This booking can no longer be cancelled - the event has already happened."
        )

    booking = cancel_booking(db, booking_id)

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    return booking