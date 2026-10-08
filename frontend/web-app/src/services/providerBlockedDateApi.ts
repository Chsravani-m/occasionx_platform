import { api } from "@/lib/apiClient";

export interface BlockedDateRequest {
  blocked_from: string;
  blocked_to: string;
  reason?: string;
}

export interface BlockedDateResponse {
  id: string;
  service_id: string;
  blocked_from: string;
  blocked_to: string;
  reason?: string;
}

export const createBlockedDate = async (
  serviceId: string,
  payload: BlockedDateRequest
) => {

  const res = await api.post(
    `/providers/services/${serviceId}/blocked-dates`,
    payload
  );

  return res.data;
};

export const getBlockedDates = async (
  serviceId: string
): Promise<BlockedDateResponse[]> => {

  const res = await api.get(
    `/providers/services/${serviceId}/blocked-dates`
  );

  return res.data;
};

export const updateBlockedDate = async (
  blockedId: string,
  payload: Partial<BlockedDateRequest>
) => {

  const res = await api.put(
    `/providers/blocked-dates/${blockedId}`,
    payload
  );

  return res.data;
};

export const deleteBlockedDate = async (
  blockedId: string
) => {

  const res = await api.delete(
    `/providers/blocked-dates/${blockedId}`
  );

  return res.data;
};