import { api } from "@/core/api/client";
import type { RNFile } from "@/features/portfolio/providerPortfolioApi";

// Mirrors frontend/web-app/src/services/providerApi.ts's Tab 1-6
// endpoints (Tab 7 KYC-doc-upload + registration-fee-payment already
// exist separately in providerRegistrationApi.ts / ProviderSetupScreen).
// Same provider-service routes, already proxied through the api-gateway
// for both clients identically - no backend changes needed here.

// --- Tab 2: Mobile Number OTP verification (pre-registration) ---

export async function sendRegistrationOtp(
  phone: string
): Promise<{ message: string; test_otp?: string; resuming?: boolean }> {
  const res = await api.post("/auth/send-registration-otp", { phone });
  // test_otp is only ever present when the backend's WHATSAPP_TEST_MODE
  // is on (nothing was actually delivered) - see
  // services/auth-service/app/services/auth_service.py. resuming is set
  // when this phone already has an incomplete registration that this
  // OTP send is about to let the person continue instead of being
  // blocked with "account already exists".
  return res.data;
}

export async function verifyRegistrationOtp(
  phone: string,
  otp: string
): Promise<{ message: string; phone_verification_token: string }> {
  const res = await api.post("/auth/verify-registration-otp", { phone, otp });
  return res.data;
}

// --- Tab 1: media uploads (logo / cover image / promotional video) ---

export async function uploadProviderLogo(
  providerId: string,
  file: RNFile
): Promise<{ logo_url: string }> {
  const formData = new FormData();
  // @ts-expect-error - RN's FormData accepts { uri, name, type } for
  // file fields, unlike the browser-only File/Blob typings TS expects.
  formData.append("file", { uri: file.uri, name: file.name, type: file.type });
  const res = await api.post(`/providers/${providerId}/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadProviderCoverImage(
  providerId: string,
  file: RNFile
): Promise<{ cover_image_url: string }> {
  const formData = new FormData();
  // @ts-expect-error - see uploadProviderLogo above.
  formData.append("file", { uri: file.uri, name: file.name, type: file.type });
  const res = await api.post(`/providers/${providerId}/cover-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadProviderPromotionalVideo(
  providerId: string,
  file: RNFile
): Promise<{ promotional_video_url: string }> {
  const formData = new FormData();
  // @ts-expect-error - see uploadProviderLogo above.
  formData.append("file", { uri: file.uri, name: file.name, type: file.type });
  const res = await api.post(`/providers/${providerId}/promotional-video`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// --- Tab 3: Business Location ---

export interface ProviderBranch {
  address?: string;
  city?: string;
  state?: string;
}

export interface LocationTabData {
  country?: string | null;
  state_id?: number | null;
  district_id?: number | null;
  location_id?: number | null;
  area?: string | null;
  postal_code?: string | null;
  address?: string | null;
  google_map_url?: string | null;
  service_radius_km?: number | null;
  branches: ProviderBranch[];
}

export async function updateProviderLocation(
  providerId: string,
  data: Partial<LocationTabData>
): Promise<LocationTabData> {
  const res = await api.put(`/providers/${providerId}/location`, data);
  return res.data;
}

// --- Tab 4: Services ---

export interface ServicesTabData {
  languages_spoken: string[];
  years_of_experience?: number | null;
  team_size?: number | null;
}

export async function updateProviderServicesTab(
  providerId: string,
  data: Partial<ServicesTabData>
): Promise<ServicesTabData> {
  const res = await api.put(`/providers/${providerId}/services-tab`, data);
  return res.data;
}

export interface ProviderCategoryAssignment {
  category_id: string;
  subcategory_id?: string | null;
}

// Primary category + "Additional Services" both go through this same
// endpoint - the first entry is treated as the primary category, any
// further entries are the additional ones. Replaces whatever was
// assigned before (mirrors web's assignProviderCategories).
export async function assignProviderCategories(
  providerId: string,
  categories: ProviderCategoryAssignment[]
) {
  const res = await api.put(`/providers/${providerId}/categories`, { categories });
  return res.data;
}

// --- Tab 5: Pricing (provider-level starting price/policy, distinct
// from the per-service Pricing rows managed in PricingScreen.tsx) ---

export interface PricingTabData {
  starting_price?: number | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  custom_quotation_available: boolean;
  advance_percentage?: number | null;
  payment_modes: string[];
  cancellation_policy?: string | null;
}

export async function updateProviderPricingTab(
  providerId: string,
  data: Partial<PricingTabData>
): Promise<PricingTabData> {
  const res = await api.put(`/providers/${providerId}/pricing-tab`, data);
  return res.data;
}

// --- Tab 6: Availability ---

export interface BusinessHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

export interface AvailabilityTabData {
  business_hours: BusinessHours;
  weekly_off: string[];
  holidays: string[];
  instant_booking: boolean;
  calendar_integration_enabled: boolean;
}

export async function updateProviderAvailabilityTab(
  providerId: string,
  data: Partial<AvailabilityTabData>
): Promise<AvailabilityTabData> {
  const res = await api.put(`/providers/${providerId}/availability-tab`, data);
  return res.data;
}

// --- Tab 7: KYC (Aadhaar number - documents themselves go through
// providerRegistrationApi.ts's uploadProviderDocument) ---

export interface KycTabData {
  aadhaar_number?: string | null;
  pan_number?: string | null;
  gst_number?: string | null;
  cancelled_cheque_url?: string | null;
}

export async function updateProviderKyc(
  providerId: string,
  data: Partial<KycTabData>
): Promise<KycTabData> {
  const res = await api.put(`/providers/${providerId}/kyc`, data);
  return res.data;
}
