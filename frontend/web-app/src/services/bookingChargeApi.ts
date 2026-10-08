import { api } from "@/lib/apiClient";

// The per-booking service charge free (non-paid-member) customers pay
// before a booking is created, to confirm the booking - separate from
// the service payment itself, which still happens afterward the same
// way it always has.

export interface CreateBookingChargeResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  // True when PAYMENT_TEST_MODE=true on the backend - no real
  // Razorpay order exists, so skip opening checkout and call
  // confirmTestBookingCharge instead.
  test_mode?: boolean;
}

export interface VerifyBookingChargePayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const createBookingCharge = async (
  customerId: string
): Promise<CreateBookingChargeResponse> => {
  const res = await api.post("/payments/booking-charge/create-order", {
    customer_id: customerId,
  });

  return res.data;
};

export const verifyBookingCharge = async (
  payload: VerifyBookingChargePayload
) => {
  const res = await api.post("/payments/booking-charge/verify", payload);

  return res.data;
};

// Dev-only: used instead of Razorpay checkout when
// CreateBookingChargeResponse.test_mode is true. The backend refuses
// this unless PAYMENT_TEST_MODE=true, so it can't be used to skip the
// charge for real.
export const confirmTestBookingCharge = async (orderId: string) => {
  const res = await api.post("/payments/booking-charge/test-confirm", {
    order_id: orderId,
  });

  return res.data;
};
