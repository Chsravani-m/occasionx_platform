import { api } from "@/lib/apiClient";

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  booking_id: string;
  // True when PAYMENT_TEST_MODE=true on the backend - no real
  // Razorpay order exists, so skip opening checkout and call
  // confirmTestPayment instead.
  test_mode?: boolean;
}

export interface VerifyPaymentPayload {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// One order covering every booking from a single cart/package
// checkout - one Razorpay popup instead of one per booking. The
// backend splits it per-provider via Route transfers internally.
export interface CreateCombinedOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  booking_ids: string[];
  test_mode?: boolean;
  // True when the flat OX application fee (normally its own separate
  // charge) got folded into this order's amount instead.
  booking_charge_included?: boolean;
}

export interface CreateCombinedOrderOptions {
  // When set (a customer id is required for it to take effect), the
  // flat OX application fee is charged together with the provider
  // payment below in this SAME order/popup, instead of as its own
  // separate charge beforehand.
  customerId?: string;
  includeBookingCharge?: boolean;
}

export interface VerifyCombinedPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const createPaymentOrder = async (
  bookingId: string
): Promise<CreateOrderResponse> => {
  const res = await api.post("/payments/create-order", {
    booking_id: bookingId,
  });

  return res.data;
};

export const createCombinedPaymentOrder = async (
  bookingIds: string[],
  options?: CreateCombinedOrderOptions
): Promise<CreateCombinedOrderResponse> => {
  const res = await api.post("/payments/create-combined-order", {
    booking_ids: bookingIds,
    customer_id: options?.customerId,
    include_booking_charge: options?.includeBookingCharge ?? false,
  });

  return res.data;
};

export const verifyCombinedPayment = async (
  payload: VerifyCombinedPaymentPayload
) => {
  const res = await api.post("/payments/verify-combined", payload);

  return res.data;
};

// Dev-only: combined-order equivalent of confirmTestPayment. Backend
// refuses this unless PAYMENT_TEST_MODE=true.
export const confirmTestCombinedPayment = async (orderId: string) => {
  const res = await api.post("/payments/combined-test-confirm", {
    order_id: orderId,
  });

  return res.data;
};

export const verifyPayment = async (
  payload: VerifyPaymentPayload
) => {
  const res = await api.post("/payments/verify", payload);

  return res.data;
};

// Dev-only: used instead of Razorpay checkout when
// CreateOrderResponse.test_mode is true. The backend refuses this
// unless PAYMENT_TEST_MODE=true, so it can't be used to bypass
// payment for real.
export const confirmTestPayment = async (orderId: string) => {
  const res = await api.post("/payments/test-confirm", {
    order_id: orderId,
  });

  return res.data;
};
