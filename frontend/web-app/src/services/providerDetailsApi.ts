import { api } from "@/lib/apiClient";

import { ProviderDetails } from "@/types/provider";

export const getProviderDetails = async (
  providerId: string
): Promise<ProviderDetails> => {

  const res = await api.get(
    `/providers/${providerId}/details`
  );

  return res.data;

};