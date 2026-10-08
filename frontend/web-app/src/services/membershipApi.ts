import { api } from "@/lib/apiClient";

// The one-time "paid user" membership fee - paid right after
// registration when the customer checks "Register as a paid user".
// Paid members skip the per-booking service charge (see
// bookingChargeApi.ts) on every future booking.

export interface CreateMembershipOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  user_id: string;
  // True when PAYMENT_TEST_MODE=true on the backend - no real
  // Razorpay order exists, so skip opening checkout and call
  // confirmTestMembershipPayment instead.
  test_mode?: boolean;
}

export interface VerifyMembershipPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface MembershipStatusResponse {
  user_id: string;
  is_paid_member: boolean;
}

export const createMembershipOrder = async (
  userId: string
): Promise<CreateMembershipOrderResponse> => {
  const res = await api.post(
    `/auth/users/${userId}/membership/create-order`
  );

  return res.data;
};

export const verifyMembershipPayment = async (
  userId: string,
  payload: VerifyMembershipPaymentPayload
): Promise<MembershipStatusResponse> => {
  const res = await api.post(
    `/auth/users/${userId}/membership/verify`,
    payload
  );

  return res.data;
};

// Dev-only: used instead of Razorpay checkout when
// CreateMembershipOrderResponse.test_mode is true. The backend
// refuses this unless PAYMENT_TEST_MODE=true, so it can't be used to
// grant paid membership for real without paying.
export const confirmTestMembershipPayment = async (
  userId: string,
  orderId: string
): Promise<MembershipStatusResponse> => {
  const res = await api.post(
    `/auth/users/${userId}/membership/test-confirm`,
    { order_id: orderId }
  );

  return res.data;
};
