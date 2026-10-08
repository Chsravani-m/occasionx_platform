from uuid import UUID

from pydantic import BaseModel


class CreateBookingChargeRequest(BaseModel):

    customer_id: UUID


class CreateBookingChargeResponse(BaseModel):

    order_id: str

    amount: int

    currency: str

    razorpay_key_id: str

    # True when PAYMENT_TEST_MODE=true - no real Razorpay order was
    # created, so the frontend should skip opening the Razorpay
    # checkout entirely and call the test-confirm endpoint instead.
    test_mode: bool = False


class TestConfirmBookingChargeRequest(BaseModel):

    order_id: str


class VerifyBookingChargeRequest(BaseModel):

    razorpay_order_id: str

    razorpay_payment_id: str

    razorpay_signature: str


class BookingChargeStatusResponse(BaseModel):

    order_id: str

    status: str
