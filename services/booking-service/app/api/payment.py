from typing import List

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    TestConfirmRequest,
    CreateCombinedOrderRequest,
    CreateCombinedOrderResponse,
    CombinedTestConfirmRequest,
    VerifyCombinedPaymentRequest,
)

from app.schemas.booking import BookingResponse

from app.crud.payment import (
    create_order,
    verify_and_complete_payment,
    confirm_test_payment,
    create_combined_order,
    verify_and_complete_combined_payment,
    confirm_test_combined_payment,
    PaymentError
)

from app.core.service_auth import current_user, ensure_self_or_admin
from app.core.ownership import (
    ensure_booking_owner,
    ensure_bookings_owner,
    ensure_order_owner,
)

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


@router.post(
    "/create-order",
    response_model=CreateOrderResponse
)
def create_order_api(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_booking_owner(db, user, payload.booking_id)

    try:
        return create_order(db, payload.booking_id)
    except PaymentError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e)
        )


@router.post(
    "/verify",
    response_model=BookingResponse
)
def verify_payment_api(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_booking_owner(db, user, payload.booking_id)
    ensure_order_owner(db, user, payload.razorpay_order_id)

    try:
        booking = verify_and_complete_payment(db, payload)
    except PaymentError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e)
        )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    return booking


@router.post(
    "/create-combined-order",
    response_model=CreateCombinedOrderResponse
)
def create_combined_order_api(
    payload: CreateCombinedOrderRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    """
    Combined-order equivalent of /create-order - covers every booking
    from a single cart/package checkout with one Razorpay order/popup,
    split per-provider on the backend via Route instead of the
    frontend opening one popup per booking.
    """

    ensure_bookings_owner(db, user, payload.booking_ids)
    if payload.customer_id is not None:
        ensure_self_or_admin(user, payload.customer_id)

    try:
        return create_combined_order(
            db,
            payload.booking_ids,
            customer_id=payload.customer_id,
            include_booking_charge=payload.include_booking_charge,
        )
    except PaymentError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e)
        )


@router.post(
    "/verify-combined",
    response_model=List[BookingResponse]
)
def verify_combined_payment_api(
    payload: VerifyCombinedPaymentRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_order_owner(db, user, payload.razorpay_order_id)

    try:
        bookings = verify_and_complete_combined_payment(db, payload)
    except PaymentError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=str(e)
        )

    if not bookings:
        raise HTTPException(
            status_code=404,
            detail="Bookings not found"
        )

    return bookings


@router.post(
    "/combined-test-confirm",
    response_model=List[BookingResponse]
)
def combined_test_confirm_payment_api(
    payload: CombinedTestConfirmRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_order_owner(db, user, payload.order_id)

    """
    Dev-only endpoint the frontend calls instead of Razorpay checkout
    when PAYMENT_TEST_MODE=true, for the combined multi-booking order
    flow. See confirm_test_combined_payment for the server-side guard
    that keeps this from working outside test mode.
    """

    try:
        bookings = confirm_test_combined_payment(db, payload.order_id)
    except PaymentError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    if not bookings:
        raise HTTPException(
            status_code=404,
            detail="Bookings not found"
        )

    return bookings


@router.post(
    "/test-confirm",
    response_model=BookingResponse
)
def test_confirm_payment_api(
    payload: TestConfirmRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_order_owner(db, user, payload.order_id)

    """
    Dev-only endpoint the frontend calls instead of Razorpay checkout
    when PAYMENT_TEST_MODE=true. See confirm_test_payment for the
    server-side guard that keeps this from working outside test mode.
    """

    try:
        booking = confirm_test_payment(db, payload.order_id)
    except PaymentError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    return booking
