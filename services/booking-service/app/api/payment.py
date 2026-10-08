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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
    """
    Combined-order equivalent of /create-order - covers every booking
    from a single cart/package checkout with one Razorpay order/popup,
    split per-provider on the backend via Route instead of the
    frontend opening one popup per booking.
    """

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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
