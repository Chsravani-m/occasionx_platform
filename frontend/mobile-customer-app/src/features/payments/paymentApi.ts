import { api } from "@/core/api/client";

export interface CreateCombinedOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  booking_ids: string[];
  test_mode?: boolean;
  booking_charge_included?: boolean;
}

export interface CreateCombinedOrderOptions {
  customerId?: string;
  includeBookingCharge?: boolean;
}

export interface VerifyCombinedPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

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

// Dev-only, requires backend PAYMENT_TEST_MODE=true.
export const confirmTestCombinedPayment = async (orderId: string) => {
  const res = await api.post("/payments/combined-test-confirm", {
    order_id: orderId,
  });
  return res.data;
};
