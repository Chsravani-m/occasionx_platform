from pydantic import BaseModel

class RegistrationPaymentResponse(BaseModel):
    order_id: str
    amount: int
    currency: str

    # True when PAYMENT_TEST_MODE=true - no real Razorpay order was
    # created, so the frontend should skip Razorpay checkout entirely
    # and call /providers/{provider_id}/mark-registration-paid
    # instead.
    test_mode: bool = False

class PaymentVerificationRequest(
    BaseModel
):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str