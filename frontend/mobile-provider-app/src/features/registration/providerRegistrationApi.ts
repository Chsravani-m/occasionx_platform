import { api } from "@/core/api/client";
import type { RNFile } from "@/features/portfolio/providerPortfolioApi";

// Everything a brand-new provider needs between registerProvider()
// succeeding and being able to sign in for real: KYC document upload,
// the one-time registration fee, and email activation. None of these
// endpoints require a JWT - the provider isn't logged in yet, they're
// all scoped purely by providerId, matching provider-service's design
// (mirrors web's providerDocumentApi.ts / SubscriptionSection.tsx).

export type DocumentType = "GST_CERTIFICATE" | "PAN_CARD" | "AADHAAR" | "BUSINESS_LICENSE";

export interface ProviderDocument {
  id: string;
  provider_id: string;
  document_type: DocumentType;
  document_url: string;
  uploaded_at: string;
}

export async function uploadProviderDocument(
  providerId: string,
  documentType: DocumentType,
  file: RNFile
): Promise<{ message: string; document: ProviderDocument }> {
  const formData = new FormData();
  formData.append("document_type", documentType);
  // @ts-expect-error - RN FormData file descriptor, see providerPortfolioApi.ts
  formData.append("file", { uri: file.uri, name: file.name, type: file.type });

  const res = await api.post(`/providers/${providerId}/documents/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getProviderDocuments(providerId: string): Promise<ProviderDocument[]> {
  const res = await api.get(`/providers/${providerId}/documents`);
  return res.data;
}

export interface RegistrationPaymentOrder {
  order_id: string;
  amount: number;
  currency: string;
  test_mode: boolean;
}

export async function createRegistrationPayment(providerId: string): Promise<RegistrationPaymentOrder> {
  const res = await api.post(`/providers/${providerId}/registration-payment`);
  return res.data;
}

// Dev/test-mode-only shortcut - the backend itself refuses this unless
// PAYMENT_TEST_MODE=true, so it's safe to call and let it 403 rather
// than needing to duplicate that env check on the client.
//
// activation_link is only present in test mode (see provider-service's
// mark_registration_paid) - test registrations are routinely created
// with fake email addresses, so there's no real inbox to check; the
// caller can surface this link directly so testing the flow doesn't
// require digging through server logs/DB for the activation token
// (mirrors web's SubscriptionSection.tsx).
export async function markRegistrationPaid(
  providerId: string
): Promise<{ success: boolean; activation_link?: string }> {
  const res = await api.post(`/providers/${providerId}/mark-registration-paid`);
  return res.data;
}

export interface RazorpayVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function verifyRegistrationPayment(
  providerId: string,
  payload: RazorpayVerification
): Promise<{ success: boolean }> {
  const res = await api.post(`/providers/${providerId}/verify-registration-payment`, payload);
  return res.data;
}

export async function activateProviderAccount(
  token: string
): Promise<{ success: boolean; business_name: string; email: string }> {
  const res = await api.post(`/providers/activate`, { token });
  return res.data;
}
