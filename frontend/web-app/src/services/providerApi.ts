import { api } from "@/lib/apiClient";

export interface ProviderRegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;

  // Proof the phone above passed OTP verification - see
  // sendRegistrationOtp/verifyRegistrationOtp below. Required.
  phone_verification_token: string;

  business_name: string;
  owner_name: string;

  // Business Location (Tab 3) and Services (Tab 4) are filled in
  // after account creation now, so these are optional here.
  state_id?: number;
  district_id?: number;
  location_id?: number;

  category_id?: string;
  subcategory_id?: string;

  address?: string;
  gst_number?: string;
  description?: string;

  // Tab 1: Business Information
  legal_entity_name?: string;
  pan_number?: string;
  year_established?: number;
  business_registration_number?: string;
  entity_type?: string;
  logo_url?: string;
  cover_image_url?: string;
  promotional_video_url?: string;

  // Tab 2: Contact Details
  contact_person?: string;
  whatsapp_number?: string;
  website_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
}

export interface ProviderRegisterResponse {
  message: string;
  user_id: string;
  provider_id: string;
  // True when this call picked up an existing, never-finished
  // registration (same phone/email, fee unpaid, not yet activated)
  // instead of creating a brand new account - see register_provider
  // in services/auth-service/app/services/auth_service.py.
  resuming?: boolean;
}

export const registerProvider = async (
  data: ProviderRegisterRequest
): Promise<ProviderRegisterResponse> => {
  const res = await api.post(
    "/auth/register-provider",
    data
  );

  return res.data;
};

// --- Tab 2: Mobile Number OTP verification (pre-registration) ---

export const sendRegistrationOtp = async (
  phone: string
): Promise<{ message: string; test_otp?: string; resuming?: boolean }> => {
  const res = await api.post(
    "/auth/send-registration-otp",
    { phone }
  );

  // test_otp is only ever present when the backend's
  // WHATSAPP_TEST_MODE is on (nothing was actually delivered) - see
  // services/auth-service/app/services/auth_service.py. resuming is
  // set when this phone already has an incomplete registration that
  // this OTP send is about to let the person continue instead of
  // being blocked with "account already exists".
  return res.data;
};

export const verifyRegistrationOtp = async (
  phone: string,
  otp: string
): Promise<{ message: string; phone_verification_token: string }> => {
  const res = await api.post(
    "/auth/verify-registration-otp",
    { phone, otp }
  );

  return res.data;
};

// --- Tab 1: media uploads (logo / cover image / promotional video) ---

export const uploadProviderLogo = async (
  providerId: string,
  file: File
): Promise<{ logo_url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(
    `/providers/${providerId}/logo`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return res.data;
};

export const uploadProviderCoverImage = async (
  providerId: string,
  file: File
): Promise<{ cover_image_url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(
    `/providers/${providerId}/cover-image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return res.data;
};

export const uploadProviderPromotionalVideo = async (
  providerId: string,
  file: File
): Promise<{ promotional_video_url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(
    `/providers/${providerId}/promotional-video`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return res.data;
};

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

export const getProviderLocation = async (
  providerId: string
): Promise<LocationTabData> => {
  const res = await api.get(`/providers/${providerId}/location`);
  return res.data;
};

export const updateProviderLocation = async (
  providerId: string,
  data: Partial<LocationTabData>
): Promise<LocationTabData> => {
  const res = await api.put(`/providers/${providerId}/location`, data);
  return res.data;
};

// --- Tab 4: Services ---

export interface ServicesTabData {
  languages_spoken: string[];
  years_of_experience?: number | null;
  team_size?: number | null;
}

export const getProviderServicesTab = async (
  providerId: string
): Promise<ServicesTabData> => {
  const res = await api.get(`/providers/${providerId}/services-tab`);
  return res.data;
};

export const updateProviderServicesTab = async (
  providerId: string,
  data: Partial<ServicesTabData>
): Promise<ServicesTabData> => {
  const res = await api.put(`/providers/${providerId}/services-tab`, data);
  return res.data;
};

export interface ProviderCategoryAssignment {
  category_id: string;
  subcategory_id?: string | null;
}

// Primary category + "Additional Services" both go through this same
// endpoint - the first entry is treated as the primary category, any
// further entries are the additional ones. Replaces whatever was
// assigned before (see provider-service crud/provider_category.py's
// assign_categories - it deletes then re-creates).
export const assignProviderCategories = async (
  providerId: string,
  categories: ProviderCategoryAssignment[]
) => {
  const res = await api.put(`/providers/${providerId}/categories`, {
    categories,
  });

  return res.data;
};

export const getProviderCategories = async (providerId: string) => {
  const res = await api.get(`/providers/${providerId}/categories`);
  return res.data;
};

// --- Tab 5: Pricing ---

export interface PricingTabData {
  starting_price?: number | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  custom_quotation_available: boolean;
  advance_percentage?: number | null;
  payment_modes: string[];
  cancellation_policy?: string | null;
}

export const getProviderPricingTab = async (
  providerId: string
): Promise<PricingTabData> => {
  const res = await api.get(`/providers/${providerId}/pricing-tab`);
  return res.data;
};

export const updateProviderPricingTab = async (
  providerId: string,
  data: Partial<PricingTabData>
): Promise<PricingTabData> => {
  const res = await api.put(`/providers/${providerId}/pricing-tab`, data);
  return res.data;
};

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

export const getProviderAvailabilityTab = async (
  providerId: string
): Promise<AvailabilityTabData> => {
  const res = await api.get(`/providers/${providerId}/availability-tab`);
  return res.data;
};

export const updateProviderAvailabilityTab = async (
  providerId: string,
  data: Partial<AvailabilityTabData>
): Promise<AvailabilityTabData> => {
  const res = await api.put(
    `/providers/${providerId}/availability-tab`,
    data
  );
  return res.data;
};

// --- Tab 7: KYC ---

export interface KycTabData {
  aadhaar_number?: string | null;
  pan_number?: string | null;
  gst_number?: string | null;
  cancelled_cheque_url?: string | null;
}

export const updateProviderKyc = async (
  providerId: string,
  data: Partial<KycTabData>
): Promise<KycTabData> => {
  const res = await api.put(`/providers/${providerId}/kyc`, data);
  return res.data;
};

export interface ProviderFull {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  verification_status: string;
  registration_fee_paid: boolean;
  account_activated: boolean;
  display_picture_url?: string | null;

  gst_number?: string | null;
  address?: string | null;
  description?: string | null;

  legal_entity_name?: string | null;
  pan_number?: string | null;
  year_established?: number | null;
  business_registration_number?: string | null;
  entity_type?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  promotional_video_url?: string | null;

  contact_person?: string | null;
  whatsapp_number?: string | null;
  website_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;

  country?: string | null;
  state_id?: number | null;
  district_id?: number | null;
  location_id?: number | null;
  area?: string | null;
  postal_code?: string | null;
  google_map_url?: string | null;
  service_radius_km?: number | null;

  years_of_experience?: number | null;
  team_size?: number | null;

  starting_price?: number | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  custom_quotation_available: boolean;
  advance_percentage?: number | null;

  instant_booking: boolean;
  calendar_integration_enabled: boolean;

  aadhaar_number?: string | null;
  cancelled_cheque_url?: string | null;
}

export const getProviderFull = async (
  providerId: string
): Promise<ProviderFull> => {
  const res = await api.get(`/providers/${providerId}`);
  return res.data;
};

export interface ProviderBasicInfo {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  verification_status: string;

  // Provider-set booking notice (hours) + free-text cancellation
  // policy (see BookingPolicyUpdate) - the backend's ProviderResponse
  // already includes these, this type just hadn't caught up. Used on
  // My Bookings to show the real policy at cancel-time instead of a
  // generic "cancel any time before the event" line shown to everyone
  // regardless of what the provider actually set.
  booking_notice_hours?: number;
  cancellation_policy?: string | null;
}

export const getProvider = async (
  providerId: string
): Promise<ProviderBasicInfo> => {
  const res = await api.get(
    `/providers/${providerId}`
  );

  return res.data;
};

export interface CategoryPricing {
  id: string;
  service_id: string;
  pricing_type: string;
  amount: number;
  unit?: string;
  min_quantity?: number;
  max_quantity?: number;
}

export interface CategoryProvider {
  id: string;
  business_name: string;
  state_id?: number;
  district_id?: number;
  location_id?: number;
  pricing: CategoryPricing[];

  // Display picture, falling back to cover image / logo / first
  // portfolio photo - see _cover_image_for in provider-service's
  // crud/provider_category.py. Optional so older cached responses
  // (or the recently-added-providers endpoint, which shares this
  // shape) still type-check even before this field existed.
  cover_image?: string;
}

export const getProvidersByCategory = async (
  categoryId: string,
  stateId?: number,
  districtId?: number,
  locationId?: number
): Promise<CategoryProvider[]> => {
  const res = await api.get(
    `/providers/category/${categoryId}`,
    {
      params: {
        state_id: stateId,
        district_id: districtId,
        location_id: locationId,
      },
    }
  );

  return res.data;
};

export interface ProviderDashboardStats {
  provider_id: string;
  business_name: string;
  verification_status: string;
  owner_name: string;
  email: string;
  phone: string;

  documents_uploaded: number;
  services_count: number;
  portfolio_count: number;
  categories_count: number;

  pricing_completed: boolean;

  registration_fee_paid: boolean;
  registration_paid_at?: string;

  onboarding_completed: boolean;

  profile_views: number;
  average_rating: number;
  total_reviews: number;
}

export const getProviderDashboard = async (
  providerId: string
): Promise<ProviderDashboardStats> => {
  const res = await api.get(
    `/providers/dashboard/${providerId}`
  );

  return res.data;
};

export interface ActivateAccountResponse {
  success: boolean;
  business_name?: string;
  email?: string;
}

export const activateProviderAccount = async (
  token: string
): Promise<ActivateAccountResponse> => {
  const res = await api.post(
    "/providers/activate",
    { token }
  );

  return res.data;
};