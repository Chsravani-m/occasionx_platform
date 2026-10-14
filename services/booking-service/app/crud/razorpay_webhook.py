"""
Razorpay webhook handling - the backstop for payments the browser never
reported back (customer closed the tab, lost network, app killed right
after paying).

Razorpay calls POST /payments/webhook/razorpay for every captured
payment. The payment's order id tells us what it was for:

- a booking / cart order or a booking service charge -> handled here
- a paid-membership order        -> auth-service (internal endpoint)
- a provider registration order  -> provider-service (internal endpoint)

Every step is idempotent: Razorpay retries webhooks and the browser may
already have confirmed the same payment, so anything already PAID is
left alone.
"""

import hashlib
import hmac
import logging
import os

import requests
from sqlalchemy.orm import Session

from app.db.models.booking import Booking
from app.db.models.booking_charge import BookingCharge
from app.db.models.payment import Payment
from app.crud.booking import confirm_booking_payment

logger = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
PROVIDER_SERVICE_URL = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")

# Events that mean money was taken for an order.
PAID_EVENTS = {"payment.captured", "order.paid"}

# The customer paid, but the booking can no longer be confirmed (it
# expired, was cancelled or rejected in the meantime) or the amount was
# short. The money has been taken, so an admin must refund or resolve
# it by hand - search payments/booking_charges for this status.
NEEDS_REVIEW = "PAID_NEEDS_REVIEW"

_CONFIRMABLE = {"PENDING", "AWAITING_PAYMENT"}


class WebhookConfigError(Exception):
    pass


def webhook_secret() -> str:
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    if not secret:
        raise WebhookConfigError("RAZORPAY_WEBHOOK_SECRET is not set")
    return secret


def signature_is_valid(body: bytes, signature: str | None) -> bool:
    if not signature:
        return False
    expected = hmac.new(
        webhook_secret().encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def extract_payment(event: dict) -> dict | None:
    """The payment entity of a paid event, or None for other events."""
    if event.get("event") not in PAID_EVENTS:
        return None
    payment = (
        event.get("payload", {}).get("payment", {}).get("entity") or {}
    )
    if not payment.get("order_id") or not payment.get("id"):
        return None
    return payment


def _paise(rupees) -> int:
    return int(round(float(rupees or 0) * 100))


def _handle_booking_order(db: Session, order_id: str, payment_id: str, amount: int):
    """
    Returns a result string if this order belongs to booking-service,
    otherwise None.
    """
    payments = db.query(Payment).filter(Payment.razorpay_order_id == order_id).all()
    charge = (
        db.query(BookingCharge)
        .filter(BookingCharge.razorpay_order_id == order_id)
        .first()
    )

    if not payments and not charge:
        return None

    rows = list(payments) + ([charge] if charge else [])

    if all(row.status == "PAID" for row in rows):
        return "already_paid"

    expected = sum(_paise(p.amount) for p in payments) + (
        _paise(charge.amount) if charge else 0
    )

    if amount < expected:
        for row in rows:
            if row.status != "PAID":
                row.razorpay_payment_id = payment_id
                row.status = NEEDS_REVIEW
        db.commit()
        logger.error(
            "Razorpay order %s paid %s paise, expected %s - marked %s",
            order_id, amount, expected, NEEDS_REVIEW,
        )
        return "amount_short"

    if charge and charge.status != "PAID":
        charge.razorpay_payment_id = payment_id
        charge.status = "PAID"

    to_confirm = []
    needs_review = False

    for payment in payments:
        if payment.status == "PAID":
            continue

        payment.razorpay_payment_id = payment_id
        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()

        if booking is not None and booking.booking_status in _CONFIRMABLE:
            payment.status = "PAID"
            to_confirm.append(booking.id)
        elif booking is not None and booking.booking_status == "CONFIRMED":
            payment.status = "PAID"
        else:
            payment.status = NEEDS_REVIEW
            needs_review = True
            logger.error(
                "Razorpay payment %s received for booking %s in status %s - "
                "marked %s for a refund/manual check",
                payment_id,
                payment.booking_id,
                booking.booking_status if booking else "missing",
                NEEDS_REVIEW,
            )

    db.commit()

    for booking_id in to_confirm:
        confirm_booking_payment(db, booking_id)

    return "needs_review" if needs_review else "confirmed"


def _forward(url: str, order_id: str, payment_id: str, amount: int):
    """
    Ask another service to complete the order. Returns its result
    string, None if the order isn't theirs, and raises if the service
    couldn't be reached (so Razorpay retries the webhook).
    """
    response = requests.post(
        url,
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "amount": amount,
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    return data.get("result") if data.get("handled") else None


def handle_paid_order(db: Session, payment: dict) -> str:
    order_id = payment["order_id"]
    payment_id = payment["id"]
    amount = int(payment.get("amount") or 0)

    result = _handle_booking_order(db, order_id, payment_id, amount)
    if result:
        return f"booking:{result}"

    result = _forward(
        f"{AUTH_SERVICE_URL}/api/v1/auth/internal/razorpay-paid",
        order_id, payment_id, amount,
    )
    if result:
        return f"membership:{result}"

    result = _forward(
        f"{PROVIDER_SERVICE_URL}/providers/internal/razorpay-paid",
        order_id, payment_id, amount,
    )
    if result:
        return f"provider_registration:{result}"

    logger.warning("Razorpay order %s is not known to any service", order_id)
    return "unknown_order"
