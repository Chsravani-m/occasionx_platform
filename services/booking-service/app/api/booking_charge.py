from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.booking_charge import (
    CreateBookingChargeRequest,
    CreateBookingChargeResponse,
    VerifyBookingChargeRequest,
    TestConfirmBookingChargeRequest,
    BookingChargeStatusResponse,
)

from app.crud.booking_charge import (
    create_booking_charge_order,
    confirm_test_booking_charge,
    verify_and_complete_booking_charge,
    BookingChargeError,
)

from app.core.service_auth import current_user, ensure_self_or_admin
from app.core.ownership import ensure_order_owner

router = APIRouter(
    prefix="/payments/booking-charge",
    tags=["Booking Service Charge"]
)


@router.post(
    "/create-order",
    response_model=CreateBookingChargeResponse
)
def create_booking_charge_order_api(
    payload: CreateBookingChargeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_self_or_admin(user, payload.customer_id)

    try:
        return create_booking_charge_order(db, payload.customer_id)
    except BookingChargeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post(
    "/verify",
    response_model=BookingChargeStatusResponse
)
def verify_booking_charge_api(
    payload: VerifyBookingChargeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_order_owner(db, user, payload.razorpay_order_id)

    try:
        charge = verify_and_complete_booking_charge(db, payload)
    except BookingChargeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {
        "order_id": charge.razorpay_order_id,
        "status": charge.status,
    }


@router.post(
    "/test-confirm",
    response_model=BookingChargeStatusResponse
)
def test_confirm_booking_charge_api(
    payload: TestConfirmBookingChargeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    """
    Dev-only endpoint the frontend calls instead of Razorpay checkout
    when PAYMENT_TEST_MODE=true. See confirm_test_booking_charge for
    the server-side guard that keeps this from working outside test
    mode.
    """

    ensure_order_owner(db, user, payload.order_id)

    try:
        charge = confirm_test_booking_charge(db, payload.order_id)
    except BookingChargeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "order_id": charge.razorpay_order_id,
        "status": charge.status,
    }
