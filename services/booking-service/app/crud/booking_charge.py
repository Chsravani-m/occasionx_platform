import os
import uuid

import razorpay

from sqlalchemy.orm import Session

from app.db.models.booking_charge import BookingCharge

from app.razorpay_client import (
    get_razorpay_client,
    RAZORPAY_KEY_ID
)


class BookingChargeError(Exception):
    pass


# Booking service charge in paise (default Rs.99), collected from
# free-plan customers per booking. Override with the
# BOOKING_CHARGE_AMOUNT_PAISE environment variable. Exported so
# crud/payment.py's combined order can fold this same amount into a
# single payment instead of collecting it as a separate charge/popup.
BOOKING_CHARGE_AMOUNT_PAISE = int(
    os.getenv("BOOKING_CHARGE_AMOUNT_PAISE", "9900")
)


def create_booking_charge_order(db: Session, customer_id):
    # In test mode, no real Razorpay order is created at all - the
    # live keys in .env are real production credentials, so even a
    # nominal Rs.1 charge would be a genuine transaction, not a
    # sandbox one. A fake order id is generated locally instead, and
    # the frontend skips checkout entirely and calls the test-confirm
    # endpoint below.
    test_mode = os.getenv("PAYMENT_TEST_MODE") == "true"

    amount_paise = BOOKING_CHARGE_AMOUNT_PAISE

    if test_mode:
        order_id = f"test_order_{uuid.uuid4().hex}"
    else:
        client = get_razorpay_client()

        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "customer_id": str(customer_id),
                "purpose": "booking_service_charge",
            },
        })

        order_id = order["id"]

    charge = BookingCharge(
        customer_id=customer_id,
        razorpay_order_id=order_id,
        amount=amount_paise / 100,
        currency="INR",
        status="CREATED",
    )

    db.add(charge)
    db.commit()
    db.refresh(charge)

    return {
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "test_mode": test_mode,
    }


def confirm_test_booking_charge(db: Session, order_id: str) -> BookingCharge:
    """
    Dev-only shortcut used instead of the real Razorpay checkout +
    signature verification when PAYMENT_TEST_MODE=true. Refuses to
    run unless test mode is on, so this can't be used to skip the
    booking service charge for real.
    """

    if os.getenv("PAYMENT_TEST_MODE") != "true":
        raise BookingChargeError(
            "Test payment confirmation is disabled."
        )

    charge = (
        db.query(BookingCharge)
        .filter(BookingCharge.razorpay_order_id == order_id)
        .first()
    )

    if not charge:
        raise BookingChargeError(
            "No booking charge record found for this order."
        )

    charge.razorpay_payment_id = f"test_pay_{uuid.uuid4().hex}"
    charge.status = "PAID"

    db.commit()
    db.refresh(charge)

    return charge


def verify_and_complete_booking_charge(db: Session, payload) -> BookingCharge:
    client = get_razorpay_client()

    charge = (
        db.query(BookingCharge)
        .filter(
            BookingCharge.razorpay_order_id == payload.razorpay_order_id
        )
        .first()
    )

    if not charge:
        raise BookingChargeError(
            "No booking charge record found for this order."
        )

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        charge.status = "FAILED"
        db.commit()
        raise BookingChargeError(
            "Payment verification failed - signature mismatch."
        )

    charge.razorpay_payment_id = payload.razorpay_payment_id
    charge.razorpay_signature = payload.razorpay_signature
    charge.status = "PAID"

    db.commit()
    db.refresh(charge)

    return charge
