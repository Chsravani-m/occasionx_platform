import os
import uuid

import razorpay

from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.models.membership_payment import MembershipPayment

from app.razorpay_client import (
    get_razorpay_client,
    RAZORPAY_KEY_ID
)


class MembershipPaymentError(Exception):
    pass


def create_membership_order(db: Session, user_id):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise MembershipPaymentError("User not found.")

    if user.is_paid_member:
        raise MembershipPaymentError(
            "This account is already a paid member."
        )

    # In test mode, no real Razorpay order is created at all - a fake
    # order id is generated locally instead, and the frontend skips
    # checkout entirely and calls the test-confirm endpoint below.
    test_mode = os.getenv("PAYMENT_TEST_MODE") == "true"

    # TEMPORARY: pinned to Rs.1 for live testing of the real Razorpay
    # checkout flow (instead of the normal Rs.499 membership fee).
    # Revert to 49900 once testing is done.
    amount_paise = 100

    if test_mode:
        order_id = f"test_order_{uuid.uuid4().hex}"
    else:
        client = get_razorpay_client()

        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "user_id": str(user_id),
                "purpose": "membership_fee",
            },
        })

        order_id = order["id"]

    payment = MembershipPayment(
        user_id=user_id,
        razorpay_order_id=order_id,
        amount=amount_paise / 100,
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
        "user_id": user_id,
        "test_mode": test_mode,
    }


def _mark_paid(db: Session, payment: MembershipPayment) -> User:
    payment.status = "PAID"

    user = (
        db.query(User)
        .filter(User.id == payment.user_id)
        .first()
    )

    if user:
        user.is_paid_member = True

    db.commit()

    return user


def confirm_test_membership_payment(db: Session, order_id: str) -> User:
    """
    Dev-only shortcut used instead of the real Razorpay checkout +
    signature verification when PAYMENT_TEST_MODE=true. Refuses to
    run unless test mode is on, so this can't be used to grant paid
    membership for free in production.
    """

    if os.getenv("PAYMENT_TEST_MODE") != "true":
        raise MembershipPaymentError(
            "Test payment confirmation is disabled."
        )

    payment = (
        db.query(MembershipPayment)
        .filter(
            MembershipPayment.razorpay_order_id == order_id
        )
        .first()
    )

    if not payment:
        raise MembershipPaymentError(
            "No membership payment record found for this order."
        )

    payment.razorpay_payment_id = f"test_pay_{uuid.uuid4().hex}"

    return _mark_paid(db, payment)


def verify_and_complete_membership_payment(db: Session, payload) -> User:
    client = get_razorpay_client()

    payment = (
        db.query(MembershipPayment)
        .filter(
            MembershipPayment.razorpay_order_id
            == payload.razorpay_order_id
        )
        .first()
    )

    if not payment:
        raise MembershipPaymentError(
            "No membership payment record found for this order."
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
        raise MembershipPaymentError(
            "Payment verification failed - signature mismatch."
        )

    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature

    return _mark_paid(db, payment)
