from uuid import UUID
from typing import List, Optional

from pydantic import BaseModel


class CreateOrderRequest(BaseModel):

    booking_id: UUID


class CreateOrderResponse(BaseModel):

    order_id: str

    amount: int

    currency: str

    razorpay_key_id: str

    booking_id: UUID

    # True when PAYMENT_TEST_MODE=true - no real Razorpay order was
    # created, so the frontend should skip opening the Razorpay
    # checkout entirely and call /payments/test-confirm instead.
    test_mode: bool = False


class TestConfirmRequest(BaseModel):

    order_id: str


class CreateCombinedOrderRequest(BaseModel):

    # All bookings from a single cart/package checkout that should be
    # charged together as one Razorpay payment, split per-provider via
    # Route on the backend.
    booking_ids: List[UUID]

    # When set (together with include_booking_charge), the flat OX
    # application fee is folded into this same payment instead of
    # being collected as its own separate charge/popup.
    customer_id: Optional[UUID] = None

    include_booking_charge: bool = False


class CreateCombinedOrderResponse(BaseModel):

    order_id: str

    amount: int

    currency: str

    razorpay_key_id: str

    booking_ids: List[UUID]

    test_mode: bool = False

    # True when the OX application fee ended up folded into this
    # order's amount - lets the frontend know it doesn't need to
    # collect that charge separately for this checkout.
    booking_charge_included: bool = False


class CombinedTestConfirmRequest(BaseModel):

    order_id: str


class VerifyCombinedPaymentRequest(BaseModel):

    razorpay_order_id: str

    razorpay_payment_id: str

    razorpay_signature: str


class VerifyPaymentRequest(BaseModel):

    booking_id: UUID

    razorpay_order_id: str

    razorpay_payment_id: str

    razorpay_signature: str


class PaymentResponse(BaseModel):

    id: UUID

    booking_id: UUID

    amount: float

    currency: str

    status: str

    class Config:
        from_attributes = True
