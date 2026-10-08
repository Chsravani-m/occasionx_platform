import { api } from "@/core/api/client";

export interface BankDetails {
  bank_account_holder_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_name?: string | null;
  payout_automated?: boolean;
}

export interface BankDetailsUpdatePayload {
  bank_account_holder_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_name: string;
}

export const getBankDetails = async (
  providerId: string
): Promise<BankDetails> => {
  const res = await api.get(`/providers/${providerId}/bank-details`);
  return res.data;
};

export const updateBankDetails = async (
  providerId: string,
  payload: BankDetailsUpdatePayload
): Promise<BankDetails> => {
  const res = await api.put(`/providers/${providerId}/bank-details`, payload);
  return res.data;
};

export interface RazorpayAccountStatus {
  razorpay_linked_account_id?: string | null;
  razorpay_account_status?: string | null;
  razorpay_account_requirements?: string[];
  razorpay_account_error?: string | null;
}

export const getRazorpayAccountStatus = async (
  providerId: string
): Promise<RazorpayAccountStatus> => {
  const res = await api.get(`/providers/${providerId}/razorpay-account`);
  return res.data;
};

// Kicks off (or resumes) Razorpay's Route linked-account onboarding so
// bookings actually get split straight to the provider instead of
// landing entirely in OccasionX's own account - see
// services/provider-service/app/crud/razorpay_account.py.
export interface RazorpayAccountSetupPayload {
  pan_number: string;
  business_type: string;
  business_category: string;
  business_subcategory: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  bank_account_holder_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_name?: string;
}

export const setupRazorpayAccount = async (
  providerId: string,
  payload: RazorpayAccountSetupPayload
): Promise<RazorpayAccountStatus> => {
  const res = await api.post(`/providers/${providerId}/razorpay-account`, payload);
  return res.data;
};
