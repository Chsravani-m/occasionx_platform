import { api } from "@/lib/apiClient";

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

export const createPricing = async (
  serviceId: string,
  payload: PricingRequest
) => {
  const res = await api.post(
    `/providers/services/${serviceId}/pricing`,
    payload
  );

  return res.data;
};

export const getServicePricing = async (
  serviceId: string
) => {
  const res = await api.get(
    `/providers/services/${serviceId}/pricing`
  );

  return res.data;
};

export const deletePricing = async (
  pricingId: string
) => {
  const res = await api.delete(
    `/providers/pricing/${pricingId}`
  );

  return res.data;
};