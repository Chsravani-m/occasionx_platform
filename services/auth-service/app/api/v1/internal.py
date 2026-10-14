from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.service_auth import require_internal
from app.crud.membership import complete_membership_from_webhook

router = APIRouter(prefix="/auth/internal", tags=["Internal"])


class RazorpayPaid(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    amount: int  # paise


@router.post("/razorpay-paid")
def razorpay_paid(
    payload: RazorpayPaid,
    db: Session = Depends(get_db),
    caller: dict = Depends(require_internal),
):
    """Called by booking-service's Razorpay webhook for membership orders."""
    result = complete_membership_from_webhook(
        db, payload.razorpay_order_id, payload.razorpay_payment_id, payload.amount
    )
    return {"handled": result is not None, "result": result}
