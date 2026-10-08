import { api, API_GATEWAY_URL } from "@/core/api/client";

// Customer-facing browsing endpoints (getProvidersByCategory,
// getProviderDetails) live in mobile-customer-app - this app never
// browses the provider directory, only manages the signed-in
// provider's own dashboard.

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
  display_picture_url?: string | null;
}

export const getProviderDashboard = async (
  providerId: string
): Promise<ProviderDashboardStats> => {
  const res = await api.get(`/providers/dashboard/${providerId}`);
  return res.data;
};

// display_picture_url comes back as a path relative to
// provider-service's own /uploads mount (e.g.
// "/uploads/providers/display/xyz.jpg") - the gateway proxies that
// same path, same convention as portfolio media (see
// providerPortfolioApi.ts's resolveMediaUrl).
export const resolveDisplayPictureUrl = (path: string) => `${API_GATEWAY_URL}${path}`;

// Same RN FormData shape as portfolio uploads - see RNFile in
// providerPortfolioApi.ts.
export const uploadDisplayPicture = async (
  providerId: string,
  file: { uri: string; name: string; type: string }
): Promise<{ display_picture_url: string }> => {
  const formData = new FormData();
  // @ts-expect-error - RN's FormData accepts { uri, name, type } for
  // file fields, unlike the browser-only File/Blob typings TS expects.
  formData.append("file", { uri: file.uri, name: file.name, type: file.type });

  const res = await api.post(`/providers/${providerId}/display-picture`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
