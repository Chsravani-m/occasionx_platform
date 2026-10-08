import { api } from "@/lib/apiClient";
import type { PackageProvider } from "@/types/package";

export interface ProviderSearchResult {
  id: string;

  business_name: string;
  owner_name: string;

  state_id?: number;
  district_id?: number;
  location_id?: number;

  category_id?: string;
  subcategory_id?: string;

  address?: string;
  cover_image?: string;

  verification_status: string;

  starting_price?: number;

  rating?: number;
  review_count?: number;

  // Category-specific spec fields (Amenities, Cuisine, etc.) - only
  // populated when categoryId/subcategoryId is passed to
  // searchProviders(), scoped to whichever of the provider's services
  // matches that category (see search_providers() in
  // provider-service/app/api/search.py).
  attributes?: Record<string, unknown>;
}

export const searchProviders = async (params: {
  state?: string;
  district?: string;
  location?: string;
  categoryId?: string;
  subcategoryId?: string;
  keyword?: string;
}): Promise<ProviderSearchResult[]> => {
  const cleanedParams = {
    ...(params.state && { state: params.state }),
    ...(params.district && { district: params.district }),
    ...(params.location && { location: params.location }),

    // Match backend parameter names
    ...(params.categoryId && {
      category_id: params.categoryId,
    }),

    ...(params.subcategoryId && {
      subcategory_id: params.subcategoryId,
    }),

    ...(params.keyword?.trim() && {
      keyword: params.keyword.trim(),
    }),
  };

  const res = await api.get("/search/providers", {
    params: cleanedParams,
  });

  return res.data;
};

export const getServicesByCategory = async (
  categoryId: string,
  params: {
    state?: number;
    district?: number;
    location?: number;
    date?: string;
  }
): Promise<PackageProvider[]> => {
  const res = await api.get(
    `/search/category/${categoryId}/services`,
    {
      params: {
        ...(params.state && { state: params.state }),
        ...(params.district && { district: params.district }),
        ...(params.location && { location: params.location }),
        ...(params.date && { date: params.date }),
      },
    }
  );

  return res.data;
};