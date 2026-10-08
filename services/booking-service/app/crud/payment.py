import os
import uuid

import razorpay

from sqlalchemy.orm import Session

from app.db.models.payment import Payment
from app.db.models.booking import Booking
from app.db.models.booking_charge import BookingCharge

from app.razorpay_client import (
    get_razorpay_client,
    RAZORPAY_KEY_ID
)

from app.crud.booking import (
    confirm_booking_payment,
    expire_stale_bookings,
)

from app.crud.booking_charge import BOOKING_CHARGE_AMOUNT_PAISE

from app.provider_client import get_provider_linked_account_id


class PaymentError(Exception):
    pass


def create_order(db: Session, booking_id):
    # If this exact booking's payment window already lapsed, this call
    # will flip it to EXPIRED and release its date hold before the
    # status check below runs.
    expire_stale_bookings(db)

    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise PaymentError("Booking not found.")

    if booking.booking_status != "AWAITING_PAYMENT":
        if booking.booking_status == "EXPIRED":
            raise PaymentError(
                "This booking's payment window expired. Please book "
                "again."
            )

        raise PaymentError(
            "This booking isn't awaiting payment."
        )

    if not booking.amount or float(booking.amount) <= 0:
        raise PaymentError(
            "This booking doesn't have a payable amount set."
        )

    # In test mode, no real Razorpay order is created at all and no
    # money moves - the live keys in .env are real production
    # credentials, so even a nominal Rs.1 charge would be a genuine
    # transaction, not a sandbox one. Instead a fake order id is
    # generated locally and the payment is completed later via
    # /payments/test-confirm (see confirm_test_payment below), which
    # the frontend calls directly instead of opening Razorpay
    # checkout. The Payment/Booking records still store the real
    # booking.amount so reporting stays accurate.
    test_mode = os.getenv("PAYMENT_TEST_MODE") == "true"

    if test_mode:
        order_id = f"test_order_{uuid.uuid4().hex}"
        amount_paise = int(round(float(booking.amount) * 100))
    else:
        client = get_razorpay_client()

        amount_paise = int(round(float(booking.amount) * 100))

        order_payload = {
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "booking_id": str(booking_id),
            },
        }

        # The service-price amount is 100% the provider's fee - the
        # platform doesn't take a commission out of it (the platform's
        # margin comes from the separate application/booking-service
        # charge). When the provider has completed Razorpay's own
        # linked-account KYC, split the order via Razorpay Route so the
        # full amount transfers straight to their account instead of
        # landing in the company account. Providers without a linked
        # account (every seeded/demo provider today) just fall back to
        # the existing behavior - full amount to the company account,
        # settled manually.
        linked_account_id = get_provider_linked_account_id(
            booking.provider_id
        )

        if linked_account_id:
            order_payload["transfers"] = [{
                "account": linked_account_id,
                "amount": amount_paise,
                "currency": "INR",
                "notes": {
                    "booking_id": str(booking_id),
                    "type": "service_provider_fee",
                },
            }]

        order = client.order.create(order_payload)

        order_id = order["id"]

    payment = Payment(
        booking_id=booking_id,
        razorpay_order_id=order_id,
        amount=booking.amount,
        currency="INR",
        status="CREATED",
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "booking_id": booking_id,
        "test_mode": test_mode,
    }


def create_combined_order(
    db: Session,
    booking_ids,
    customer_id=None,
    include_booking_charge: bool = False,
):
    """
    One Razorpay order covering every booking in a single cart/package
    checkout, instead of a separate order per booking - split
    per-provider via Route so each provider's own share still lands in
    their account rather than one lump sum to the company account.

    When include_booking_charge is set (a free-user customer_id must
    also be given), the OX application fee - normally its own separate
    charge/popup, see crud/booking_charge.py - is folded into this SAME
    order/payment instead of being collected separately. It's charged
    per service being booked in this batch (BOOKING_CHARGE_AMOUNT_PAISE
    x number of bookings), not a single flat amount, so booking 2
    services in one go costs twice what booking 1 does. That portion
    never gets a Route transfer entry, so it simply stays with the
    company account, same as any booking whose provider hasn't linked
    an account yet - a BookingCharge row is still created/marked PAID
    alongside it purely for reporting.
    """

    expire_stale_bookings(db)

    bookings = (
        db.query(Booking)
        .filter(Booking.id.in_(booking_ids))
        .all()
    )

    found_ids = {str(b.id) for b in bookings}
    missing = [
        str(bid) for bid in booking_ids if str(bid) not in found_ids
    ]

    if missing:
        raise PaymentError(
            f"Booking(s) not found: {', '.join(missing)}"
        )

    for booking in bookings:
        label = booking.service_name or "a service"

        if booking.booking_status != "AWAITING_PAYMENT":
            if booking.booking_status == "EXPIRED":
                raise PaymentError(
                    f"The booking for {label} expired. Please book "
                    "again."
                )

            raise PaymentError(
                f"The booking for {label} isn't awaiting payment."
            )

        if not booking.amount or float(booking.amount) <= 0:
            raise PaymentError(
                f"The booking for {label} doesn't have a payable "
                "amount set."
            )

    total_amount_paise = sum(
        int(round(float(b.amount) * 100)) for b in bookings
    )

    charge_included = bool(include_booking_charge and customer_id)

    # Per service, not a single flat fee - booking N services in one
    # go charges N x BOOKING_CHARGE_AMOUNT_PAISE.
    booking_charge_total_paise = BOOKING_CHARGE_AMOUNT_PAISE * len(bookings)

    if charge_included:
        total_amount_paise += booking_charge_total_paise

        # Split evenly across every booking in this batch so each one
        # carries its own share of the fee - lets receipts show it as
        # its own line item per booking instead of only on the shared
        # BookingCharge row (see Booking.application_fee).
        per_booking_fee = (
            BOOKING_CHARGE_AMOUNT_PAISE / 100
        )

        for booking in bookings:
            booking.application_fee = per_booking_fee

    test_mode = os.getenv("PAYMENT_TEST_MODE") == "true"

    if test_mode:
        order_id = f"test_order_{uuid.uuid4().hex}"
    else:
        client = get_razorpay_client()

        order_payload = {
            "amount": total_amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "booking_ids": ",".join(str(b.id) for b in bookings),
                "booking_charge_included": str(charge_included),
            },
        }

        # One Route transfer entry per booking, so each provider's own
        # share of this single combined charge lands straight in THEIR
        # linked account rather than all going to one place. Bookings
        # whose provider hasn't linked an account yet just don't get a
        # transfer entry - that portion falls back to the company
        # account, same as the single-booking flow above.
        transfers = []

        for booking in bookings:
            linked_account_id = get_provider_linked_account_id(
                booking.provider_id
            )

            if linked_account_id:
                transfers.append({
                    "account": linked_account_id,
                    "amount": int(round(float(booking.amount) * 100)),
                    "currency": "INR",
                    "notes": {
                        "booking_id": str(booking.id),
                        "type": "service_provider_fee",
                    },
                })

        if transfers:
            order_payload["transfers"] = transfers

        order = client.order.create(order_payload)

        order_id = order["id"]

    for booking in bookings:
        db.add(Payment(
            booking_id=booking.id,
            razorpay_order_id=order_id,
            amount=booking.amount,
            currency="INR",
            status="CREATED",
        ))

    if charge_included:
        db.add(BookingCharge(
            customer_id=customer_id,
            razorpay_order_id=order_id,
            amount=booking_charge_total_paise / 100,
            currency="INR",
            status="CREATED",
        ))

    db.commit()

    return {
        "order_id": order_id,
        "amount": total_amount_paise,
        "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "booking_ids": [b.id for b in bookings],
        "test_mode": test_mode,
        "booking_charge_included": charge_included,
    }


def confirm_test_combined_payment(db: Session, order_id: str):
    """
    Combined-order equivalent of confirm_test_payment - marks every
    Payment row under this order id PAID and confirms each of their
    bookings. Same test-mode-only guard.
    """

    if os.getenv("PAYMENT_TEST_MODE") != "true":
        raise PaymentError(
            "Test payment confirmation is disabled."
        )

    payments = (
        db.query(Payment)
        .filter(Payment.razorpay_order_id == order_id)
        .all()
    )

    if not payments:
        raise PaymentError(
            "No payment records found for this order."
        )

    shared_payment_id = f"test_pay_{uuid.uuid4().hex}"

    for payment in payments:
        payment.razorpay_payment_id = shared_payment_id
        payment.status = "PAID"

    charge = (
        db.query(BookingCharge)
        .filter(BookingCharge.razorpay_order_id == order_id)
        .first()
    )

    if charge:
        charge.razorpay_payment_id = shared_payment_id
        charge.status = "PAID"

    db.commit()

    return [
        confirm_booking_payment(db, payment.booking_id)
        for payment in payments
    ]


def verify_and_complete_combined_payment(db: Session, payload):
    """
    Combined-order equivalent of verify_and_complete_payment - one
    signature verification for the whole order, then every booking
    under it gets marked PAID and confirmed.
    """

    client = get_razorpay_client()

    payments = (
        db.query(Payment)
        .filter(
            Payment.razorpay_order_id == payload.razorpay_order_id
        )
        .all()
    )

    if not payments:
        raise PaymentError(
            "No payment records found for this order."
        )

    charge = (
        db.query(BookingCharge)
        .filter(
            BookingCharge.razorpay_order_id == payload.razorpay_order_id
        )
        .first()
    )

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        for payment in payments:
            payment.status = "FAILED"

        if charge:
            charge.status = "FAILED"

        db.commit()

        raise PaymentError(
            "Payment verification failed - signature mismatch."
        )

    for payment in payments:
        payment.razorpay_payment_id = payload.razorpay_payment_id
        payment.razorpay_signature = payload.razorpay_signature
        payment.status = "PAID"

    if charge:
        charge.razorpay_payment_id = payload.razorpay_payment_id
        charge.razorpay_signature = payload.razorpay_signature
        charge.status = "PAID"

    db.commit()

    return [
        confirm_booking_payment(db, payment.booking_id)
        for payment in payments
    ]


def confirm_test_payment(db: Session, order_id: str):
    """
    Dev-only shortcut used instead of the real Razorpay checkout +
    signature verification when PAYMENT_TEST_MODE=true. Marks the
    payment PAID and confirms the booking without any Razorpay call
    or real money moving. Refuses to run unless test mode is on, so
    this can't be used to bypass payment for real.
    """

    if os.getenv("PAYMENT_TEST_MODE") != "true":
        raise PaymentError(
            "Test payment confirmation is disabled."
        )

    payment = (
        db.query(Payment)
        .filter(Payment.razorpay_order_id == order_id)
        .first()
    )

    if not payment:
        raise PaymentError(
            "No payment record found for this order."
        )

    payment.razorpay_payment_id = f"test_pay_{uuid.uuid4().hex}"
    payment.status = "PAID"

    db.commit()

    return confirm_booking_payment(db, payment.booking_id)


def verify_and_complete_payment(db: Session, payload):
    client = get_razorpay_client()

    payment = (
        db.query(Payment)
        .filter(
            Payment.razorpay_order_id == payload.razorpay_order_id
        )
        .first()
    )

    if not payment:
        raise PaymentError(
            "No payment record found for this order."
        )

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        payment.status = "FAILED"
        db.commit()
        raise PaymentError(
            "Payment verification failed - signature mismatch."
        )

    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature
    payment.status = "PAID"

    db.commit()

    return confirm_booking_payment(db, payment.booking_id)
