import { api } from "@/lib/apiClient";

export interface ProviderService {
    id: string;
    provider_id: string;
    category_id: string;
    subcategory_id?: string;
    name: string;
    description?: string;
    attributes?: Record<string, unknown>;
}

export const getProviderServices = async (
  providerId: string
) => {
  const res = await api.get(
    `/providers/${providerId}/services`
  );

  return res.data;
};

export const createProviderService = async (
  providerId: string,
  payload: {
    category_id: string;
    subcategory_id?: string;
    name: string;
    description?: string;
  }
) => {
  const res = await api.post(
    `/providers/${providerId}/services`,
    payload
  );

  return res.data;
};

export const deleteProviderService = async (
  serviceId: string
) => {
  const res = await api.delete(
    `/providers/services/${serviceId}`
  );

  return res.data;
};

export const updateProviderService = async (
  serviceId: string,
  payload: {
    name?: string;
    description?: string;
    attributes?: Record<string, unknown>;
  }
) => {
  const res = await api.put(
    `/providers/services/${serviceId}`,
    payload
  );

  return res.data;
};