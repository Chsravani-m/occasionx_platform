import { api } from "@/core/api/client";

export interface CreateMembershipOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  user_id: string;
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
  const res = await api.post(`/auth/users/${userId}/membership/create-order`);
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
