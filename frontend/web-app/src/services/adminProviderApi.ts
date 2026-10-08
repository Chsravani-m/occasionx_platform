import { api } from "@/lib/apiClient";

export const getProviders = async () => {
  const res = await api.get(
    "/providers/"
  );

  return res.data;
};

export const getVerifiedProviders =
  async () => {
    const res = await api.get(
      "/providers/verified"
    );

    return res.data;
  };

export const getProviderStats =
  async () => {
    const res = await api.get(
      "/providers/stats"
    );

    return res.data;
  };

export const getProviderVerificationDetails =
  async (
    providerId: string
  ) => {
    const res = await api.get(
      `/providers/${providerId}/verification-details`
    );

    return res.data;
  };

export const getProviderDocuments =
  async (
    providerId: string
  ) => {
    const res = await api.get(
      `/providers/${providerId}/documents`
    );

    return res.data;
  };