import { api } from "@/core/api/client";

// Mirrors frontend/web-app/src/services/providerServiceApi.ts - same
// provider-service endpoints, already proxied through the api-gateway's
// generic /providers/{path:path} passthrough.

export interface ProviderService {
  id: string;
  provider_id: string;
  category_id: string;
  subcategory_id?: string;
  name: string;
  description?: string;
  attributes?: Record<string, unknown>;
}

export async function getProviderServices(providerId: string): Promise<ProviderService[]> {
  const res = await api.get(`/providers/${providerId}/services`);
  return res.data;
}

export async function createProviderService(
  providerId: string,
  payload: {
    category_id: string;
    subcategory_id?: string;
    name: string;
    description?: string;
  }
): Promise<ProviderService> {
  const res = await api.post(`/providers/${providerId}/services`, payload);
  return res.data;
}

export async function deleteProviderService(serviceId: string) {
  const res = await api.delete(`/providers/services/${serviceId}`);
  return res.data;
}

export async function updateProviderService(
  serviceId: string,
  payload: {
    name?: string;
    description?: string;
    attributes?: Record<string, unknown>;
  }
): Promise<ProviderService> {
  const res = await api.put(`/providers/services/${serviceId}`, payload);
  return res.data;
}
