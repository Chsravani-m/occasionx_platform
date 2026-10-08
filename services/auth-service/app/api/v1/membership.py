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


router = APIRouter(
    prefix="/auth/users",
    tags=["Membership"]
)


@router.post(
    "/{user_id}/membership/create-order",
    response_model=CreateMembershipOrderResponse
)
def create_membership_order_api(
    user_id: UUID,
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
    """
    Dev-only endpoint the frontend calls instead of Razorpay checkout
    when PAYMENT_TEST_MODE=true. See confirm_test_membership_payment
    for the server-side guard that keeps this from working outside
    test mode.
    """

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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user.id,
        "is_paid_member": user.is_paid_member,
    }
