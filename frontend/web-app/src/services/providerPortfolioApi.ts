import { api } from "@/lib/apiClient";

export const uploadPortfolio = async (
  providerId: string,
  title: string,
  description: string,
  file: File
) => {

  const formData = new FormData();

  formData.append(
    "title",
    title
  );

  formData.append(
    "description",
    description
  );

  formData.append(
    "file",
    file
  );

  const res = await api.post(
    `/providers/${providerId}/portfolio`,
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data"
      }
    }
  );

  return res.data;
};

export const getPortfolio = async (
  providerId: string
) => {

  const res = await api.get(
    `/providers/${providerId}/portfolio`
  );

  return res.data;
};

export const deletePortfolio = async (
  portfolioId: string
) => {

  await api.delete(
    `/providers/portfolio/${portfolioId}`
  );
};