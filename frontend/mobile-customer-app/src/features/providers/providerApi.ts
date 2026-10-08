import { api } from "@/core/api/client";

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
  cover_image?: string | null;
}

export const getProvidersByCategory = async (
  categoryId: string,
  stateId?: number,
  districtId?: number,
  locationId?: number
): Promise<CategoryProvider[]> => {
  const res = await api.get(`/providers/category/${categoryId}`, {
    params: {
      state_id: stateId,
      district_id: districtId,
      location_id: locationId,
    },
  });
  return res.data;
};

// Newest verified providers across every category - powers the
// Browse screen's default "Recently Added" view (see
// BrowseScreen.tsx) instead of always landing on one arbitrary
// category.
export const getRecentlyAddedProviders = async (
  stateId?: number,
  districtId?: number,
  locationId?: number,
  limit = 20
): Promise<CategoryProvider[]> => {
  const res = await api.get("/providers/recent", {
    params: {
      state_id: stateId,
      district_id: districtId,
      location_id: locationId,
      limit,
    },
  });
  return res.data;
};

export interface PricingPackage {
  id: string;
  pricing_type: string;
  amount: number;
  currency: string;
  unit?: string;
  min_quantity?: number;
  max_quantity?: number;
  occupancy_per_room?: number | null;
  total_rooms?: number | null;
}

export interface ProviderService {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  starting_price?: number;
  pricing: PricingPackage[];
}

export interface Provider {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  address?: string;
  description?: string;
  verification_status: string;
  starting_price?: number;
  rating?: number;
  review_count?: number;

  // Provider-set booking notice (hours) + free-text cancellation
  // policy, shown to the customer before they book.
  booking_notice_hours?: number;
  cancellation_policy?: string | null;

  // Dedicated profile/cover photo the provider set themselves - shown
  // as the hero background behind the business name on this page.
  // Falls back to cover_image_url, then logo_url (both set during
  // registration's "Business Photos & Video" step), then the first
  // portfolio image, then a colored icon tile, when unset (see
  // ProviderDetailsScreen.tsx).
  display_picture_url?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
}

export interface PortfolioItem {
  id: string;
  media_url: string;
  media_type: string;
  title?: string;
  description?: string;
}

export interface ProviderDetails {
  provider: Provider;
  portfolio: PortfolioItem[];
  services: ProviderService[];
  starting_price?: number;
  rating: number;
  review_count: number;
}

export const getProviderDetails = async (
  providerId: string
): Promise<ProviderDetails> => {
  const res = await api.get(`/providers/${providerId}/details`);
  return res.data;
};

// getProviderDashboard/ProviderDashboardStats live in mobile-provider-app -
// this app never shows the provider dashboard.
