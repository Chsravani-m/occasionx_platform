"""
Checks that the logged-in customer owns the bookings / payment orders
they are acting on. Admins and other OccasionX services may act on any.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.service_auth import is_admin, ensure_self_or_admin
from app.db.models.booking import Booking
from app.db.models.payment import Payment
from app.db.models.booking_charge import BookingCharge


def _forbidden():
    return HTTPException(
        status_code=403,
        detail="Not authorized to access this resource"
    )


def ensure_booking_owner(db: Session, user: dict, booking_id) -> None:
    if is_admin(user):
        return
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    ensure_self_or_admin(user, booking.customer_id)


def ensure_bookings_owner(db: Session, user: dict, booking_ids) -> None:
    for booking_id in booking_ids:
        ensure_booking_owner(db, user, booking_id)


def ensure_order_owner(db: Session, user: dict, order_id: str) -> None:
    """The Razorpay order must belong to the caller (bookings or charge)."""
    if is_admin(user):
        return

    customer_ids = set()

    booking_ids = [
        row.booking_id
        for row in db.query(Payment).filter(Payment.razorpay_order_id == order_id)
    ]
    if booking_ids:
        customer_ids.update(
            str(b.customer_id)
            for b in db.query(Booking).filter(Booking.id.in_(booking_ids))
        )

    customer_ids.update(
        str(c.customer_id)
        for c in db.query(BookingCharge).filter(
            BookingCharge.razorpay_order_id == order_id
        )
    )

    if not customer_ids:
        # Let the payment code report "no such order" as before.
        return

    if customer_ids != {str(user.get("sub"))}:
        raise _forbidden()
