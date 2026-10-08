import { api } from "@/core/api/client";

// Blocked dates are scoped per *service*, not per provider - a provider
// with 3 services has independent blocked-date rows per service. This
// mirrors web's providerBlockedDateApi.ts exactly (same endpoints).
export interface BlockedDate {
  id: string;
  service_id: string;
  blocked_from: string; // "YYYY-MM-DD"
  blocked_to: string;
  reason?: string;
}

export interface BlockedDatePayload {
  blocked_from: string;
  blocked_to: string;
  reason?: string;
}

export async function getBlockedDates(serviceId: string): Promise<BlockedDate[]> {
  const res = await api.get(`/providers/services/${serviceId}/blocked-dates`);
  return res.data;
}

export async function createBlockedDate(
  serviceId: string,
  payload: BlockedDatePayload
): Promise<BlockedDate> {
  const res = await api.post(`/providers/services/${serviceId}/blocked-dates`, payload);
  return res.data;
}

export async function deleteBlockedDate(blockedId: string) {
  const res = await api.delete(`/providers/blocked-dates/${blockedId}`);
  return res.data;
}
