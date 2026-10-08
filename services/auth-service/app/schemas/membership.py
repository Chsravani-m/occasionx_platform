from uuid import UUID

from pydantic import BaseModel


class CreateMembershipOrderResponse(BaseModel):

    order_id: str

    amount: int

    currency: str

    razorpay_key_id: str

    user_id: UUID

    # True when PAYMENT_TEST_MODE=true - no real Razorpay order was
    # created, so the frontend should skip opening the Razorpay
    # checkout entirely and call the test-confirm endpoint instead.
    test_mode: bool = False


class TestConfirmMembershipRequest(BaseModel):

    order_id: str


class VerifyMembershipPaymentRequest(BaseModel):

    razorpay_order_id: str

    razorpay_payment_id: str

    razorpay_signature: str


class MembershipStatusResponse(BaseModel):

    user_id: UUID

    is_paid_member: bool
