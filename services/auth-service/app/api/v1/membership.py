from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.schemas.membership import (
    CreateMembershipOrderResponse,
    TestConfirmMembershipRequest,
    VerifyMembershipPaymentRequest,
    MembershipStatusResponse,
)

from app.crud.membership import (
    create_membership_order,
    confirm_test_membership_payment,
    verify_and_complete_membership_payment,
    MembershipPaymentError,
)

from app.db.models.user import User
from app.db.models.membership_payment import MembershipPayment

from app.core.service_auth import current_user, ensure_self_or_admin


router = APIRouter(
    prefix="/auth/users",
    tags=["Membership"]
)


def _ensure_order_belongs_to(db: Session, order_id: str, user_id: UUID) -> None:
    payment = (
        db.query(MembershipPayment)
        .filter(MembershipPayment.razorpay_order_id == order_id)
        .first()
    )
    if payment is None or str(payment.user_id) != str(user_id):
        raise HTTPException(
            status_code=400,
            detail="This payment does not belong to this account."
        )


@router.post(
    "/{user_id}/membership/create-order",
    response_model=CreateMembershipOrderResponse
)
def create_membership_order_api(
    user_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_self_or_admin(user, user_id)

    try:
        return create_membership_order(db, user_id)
    except MembershipPaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post(
    "/{user_id}/membership/test-confirm",
    response_model=MembershipStatusResponse
)
def test_confirm_membership_api(
    user_id: UUID,
    payload: TestConfirmMembershipRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    """
    Dev-only endpoint the frontend calls instead of Razorpay checkout
    when PAYMENT_TEST_MODE=true. See confirm_test_membership_payment
    for the server-side guard that keeps this from working outside
    test mode.
    """
    ensure_self_or_admin(user, user_id)
    _ensure_order_belongs_to(db, payload.order_id, user_id)

    try:
        user = confirm_test_membership_payment(db, payload.order_id)
    except MembershipPaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user.id,
        "is_paid_member": user.is_paid_member,
    }


@router.post(
    "/{user_id}/membership/verify",
    response_model=MembershipStatusResponse
)
def verify_membership_payment_api(
    user_id: UUID,
    payload: VerifyMembershipPaymentRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_self_or_admin(user, user_id)
    _ensure_order_belongs_to(db, payload.razorpay_order_id, user_id)

    try:
        user = verify_and_complete_membership_payment(db, payload)
    except MembershipPaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user.id,
        "is_paid_member": user.is_paid_member,
    }


@router.get(
    "/{user_id}/membership",
    response_model=MembershipStatusResponse
)
def get_membership_status_api(
    user_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    ensure_self_or_admin(user, user_id)

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user.id,
        "is_paid_member": user.is_paid_member,
    }
