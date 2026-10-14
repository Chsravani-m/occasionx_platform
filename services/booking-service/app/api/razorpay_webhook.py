import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.crud.razorpay_webhook import (
    WebhookConfigError,
    extract_payment,
    handle_paid_order,
    signature_is_valid,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments/webhook", tags=["Payments"])


@router.post("/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Razorpay -> OccasionX. Set this URL up in the Razorpay dashboard
    (Settings -> Webhooks) as https://<API_DOMAIN>/payments/webhook/razorpay
    with the events payment.captured and order.paid, and the same secret
    as RAZORPAY_WEBHOOK_SECRET.

    No login: Razorpay proves who it is with the X-Razorpay-Signature
    header (HMAC of the raw body with the webhook secret).
    """
    body = await request.body()

    try:
        valid = signature_is_valid(body, request.headers.get("X-Razorpay-Signature"))
    except WebhookConfigError:
        logger.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set")
        raise HTTPException(status_code=503, detail="Webhook not configured")

    if not valid:
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event = json.loads(body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    payment = extract_payment(event)

    if payment is None:
        return {"status": "ignored", "event": event.get("event")}

    try:
        result = handle_paid_order(db, payment)
    except Exception:
        # A non-2xx response makes Razorpay retry later.
        logger.exception("Razorpay webhook failed for order %s", payment.get("order_id"))
        raise HTTPException(status_code=500, detail="Could not process payment")

    logger.info("Razorpay webhook %s order %s: %s", event.get("event"), payment["order_id"], result)
    return {"status": "ok", "result": result}
