import { api } from "@/lib/apiClient";

export const uploadProviderDocument = async (
  providerId: string,
  documentType: string,
  file: File
) => {
  const formData = new FormData();

  formData.append(
    "document_type",
    documentType
  );

  formData.append(
    "file",
    file
  );

  const res = await api.post(
    `/providers/${providerId}/documents/upload`,
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

export const getProviderDocuments =
  async (providerId: string) => {

    const res = await api.get(
      `/providers/${providerId}/documents`
    );

    return res.data;
};