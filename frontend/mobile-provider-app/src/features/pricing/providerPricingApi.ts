import { api } from "@/core/api/client";

// Mirrors frontend/web-app/src/services/providerPricingApi.ts.

export type PricingType =
  | "FIXED"
  | "HOURLY"
  | "PACKAGE"
  | "PER_PERSON"
  | "PER_PLATE"
  | "PER_DAY"
  | "CUSTOM";

export interface PricingRequest {
  pricing_type: PricingType;
  amount: number;
  currency: string;
  unit?: string;
  min_quantity?: number;
  max_quantity?: number;
  description?: string;
  occupancy_per_room?: number;
  total_rooms?: number;
}

export interface Pricing {
  id: string;
  pricing_type: string;
  amount: number;
  currency: string;
  unit?: string;
  min_quantity?: number;
  max_quantity?: number;
  description?: string;
  occupancy_per_room?: number;
  total_rooms?: number;
}

export async function createPricing(serviceId: string, payload: PricingRequest): Promise<Pricing> {
  const res = await api.post(`/providers/services/${serviceId}/pricing`, payload);
  return res.data;
}

export async function getServicePricing(serviceId: string): Promise<Pricing[]> {
  const res = await api.get(`/providers/services/${serviceId}/pricing`);
  return res.data;
}

export async function deletePricing(pricingId: string) {
  const res = await api.delete(`/providers/pricing/${pricingId}`);
  return res.data;
}
