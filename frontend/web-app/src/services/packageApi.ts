import api from "@/lib/apiClient";

export interface PackageCategoryInput {
  category_id: string;
  required: boolean;
}

export type PackageTier = "BASIC" | "STANDARD" | "PREMIUM";

export interface CreatePackagePayload {
  event_type_id: string;
  name: string;
  description?: string;
  min_budget: number;
  max_budget: number;
  tier: PackageTier;
  categories: PackageCategoryInput[];
}

export interface Package {
  id: string;
  event_type_id: string;
  name: string;
  description: string | null;
  min_budget: number;
  max_budget: number;
  active: boolean;
  tier: PackageTier;
}

export interface UpdatePackagePayload extends CreatePackagePayload {
  active: boolean;
}

export interface PackageCategoryDetail {
  id: string;
  package_id: string;
  category_id: string;
  category_name: string;
  required: boolean;
}

export const getPackages = async (): Promise<Package[]> => {
  const res = await api.get("/catalog/packages");

  return res.data;
};

export const createPackage = async (
  payload: CreatePackagePayload
): Promise<Package> => {
  const res = await api.post(
    "/catalog/packages",
    payload
  );

  return res.data;
};

export const updatePackage = async (
  packageId: string,
  payload: UpdatePackagePayload
): Promise<Package> => {
  const res = await api.put(
    `/catalog/packages/${packageId}`,
    payload
  );

  return res.data;
};

export const getPackageCategoryDetails = async (
  packageId: string
): Promise<PackageCategoryDetail[]> => {
  const res = await api.get(
    `/catalog/packages/${packageId}/categories`
  );

  return res.data;
};

export const deactivatePackage = async (
  packageId: string
) => {
  const res = await api.delete(
    `/catalog/packages/${packageId}`
  );

  return res.data;
};

export const recommendPackages = async (
  payload: {
    event_type_id: string;
    budget: number;
    guest_count: number;
    state_id: number;
    district_id: number;
    location_id: number;
    event_date?: string;
  }
) => {
  const res = await api.post(
    "/search/packages/recommend",
    payload
  );

  return res.data;
};

export interface AutoPackageRequest {
  event_type_id: string;
  budget: number;
  guest_count: number;
  state_id: number;
  district_id: number;
  location_id: number;
  event_date?: string;
}

export interface AutoPackageServiceItem {
  provider_id: string;
  provider_name: string;
  service_id: string;
  service_name: string;
  category_id: string;
  category_name: string;
  pricing_id?: string | null;
  price: number;
  pricing_type?: string | null;
  unit?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  occupancy_per_room?: number | null;
  total_rooms?: number | null;
  rating: number;
}

export interface AutoPackageResponse {
  available: boolean;
  message?: string | null;
  estimated_cost: number;
  providers_count: number;
  breakdown: { category: string; cost: number }[];
  services: AutoPackageServiceItem[];
}

export const buildAutoPackage = async (
  payload: AutoPackageRequest
): Promise<AutoPackageResponse> => {
  const res = await api.post(
    "/search/packages/auto-build",
    payload
  );

  return res.data;
};

export interface AIProposalRequest {
  event_type_name: string;
  package_name: string;
  budget: number;
  guest_count: number;
  estimated_cost: number;
  breakdown: { category: string; cost: number }[];
  location_label?: string;
  event_date?: string;
}

export interface AIProposalResponse {
  available: boolean;
  proposal: string;
}

export const getAIProposal = async (
  payload: AIProposalRequest
): Promise<AIProposalResponse> => {
  const res = await api.post(
    "/ai/proposal",
    payload
  );

  return res.data;
};

export interface BudgetEstimateRequest {
  event_type_id: string;
  budget: number;
  guest_count: number;
  state_id: number;
  district_id: number;
  location_id: number;
  event_date?: string;
}

export interface BudgetCategoryEstimate {
  category_id: string;
  category_name: string;
  estimated_cost: number;
  provider_count: number;
  min_price: number | null;
  max_price: number | null;
  note?: string | null;
}

export interface BudgetEstimateResponse {
  available: boolean;
  message?: string | null;
  budget: number;
  total_estimated_cost: number;
  within_budget: boolean;
  remaining_budget: number;
  categories_count: number;
  breakdown: BudgetCategoryEstimate[];
}

export const getBudgetEstimate = async (
  payload: BudgetEstimateRequest
): Promise<BudgetEstimateResponse> => {
  const res = await api.post(
    "/budget/estimate",
    payload
  );

  return res.data;
};

export interface VendorRecommendRequest {
  category_id: string;
  category_name?: string;
  guest_count: number;
  state_id: number;
  district_id: number;
  location_id: number;
  budget?: number;
  event_date?: string;
  limit?: number;
}

export interface VendorRecommendation {
  provider_id: string;
  provider_name: string;
  service_id: string;
  service_name: string;
  category_id?: string | null;
  category_name?: string | null;
  pricing_id?: string | null;
  price: number;
  pricing_type?: string | null;
  unit?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  occupancy_per_room?: number | null;
  total_rooms?: number | null;
  rating: number;
  estimated_cost: number;
  within_budget: boolean;
}

export interface VendorRecommendResponse {
  available: boolean;
  message?: string | null;
  category_id: string;
  category_name?: string | null;
  budget?: number | null;
  total_options: number;
  recommendations: VendorRecommendation[];
}

export const recommendVendors = async (
  payload: VendorRecommendRequest
): Promise<VendorRecommendResponse> => {
  const res = await api.post(
    "/vendor/recommend",
    payload
  );

  return res.data;
};

export const getPackageProviders = async (
  packageId: string,
  state: number,
  district: number,
  location: number,
  eventDate?: string
) => {
  const res = await api.get(
    `/search/packages/${packageId}/providers`,
    {
      params: {
        state,
        district,
        location,
        ...(eventDate ? { event_date: eventDate } : {}),
      },
    }
  );

  return res.data;
};