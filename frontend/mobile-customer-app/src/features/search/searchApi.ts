import { api } from "@/core/api/client";

// Mirrors web-app/src/services/searchApi.ts's searchProviders - same
// /search/providers endpoint, same query param names.
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
  attributes?: Record<string, unknown>;
}

export const searchProviders = async (params: {
  state?: number;
  district?: number;
  location?: number;
  categoryId?: string;
  subcategoryId?: string;
  keyword?: string;
}): Promise<ProviderSearchResult[]> => {
  const cleanedParams = {
    ...(params.state && { state: params.state }),
    ...(params.district && { district: params.district }),
    ...(params.location && { location: params.location }),
    ...(params.categoryId && { category_id: params.categoryId }),
    ...(params.subcategoryId && { subcategory_id: params.subcategoryId }),
    ...(params.keyword?.trim() && { keyword: params.keyword.trim() }),
  };

  const res = await api.get("/search/providers", { params: cleanedParams });
  return res.data;
};
