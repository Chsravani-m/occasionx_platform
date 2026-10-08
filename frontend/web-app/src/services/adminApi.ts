import { api } from "@/lib/apiClient";

export const getProviders = async () => {
  const res = await api.get("/providers");
  return res.data;
};

export const verifyProvider = async (
  providerId: string
) => {
  const res = await api.patch(
    `/providers/${providerId}/verify`,
    {
      verification_status: "VERIFIED",
    }
  );

  return res.data;
};

export const rejectProvider = async (
  providerId: string
) => {
  const res = await api.patch(
    `/providers/${providerId}/verify`,
    {
      verification_status: "REJECTED",
    }
  );

  return res.data;
};