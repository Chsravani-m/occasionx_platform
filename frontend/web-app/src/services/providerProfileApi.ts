import { api } from "@/lib/apiClient";

export const getProviderProfile = async (
  providerId: string
) => {

  const res = await api.get(
    `/providers/${providerId}`
  );

  return res.data;
};

export const updateProviderProfile = async (
  providerId: string,
  payload: unknown
) => {

  const res = await api.put(
    `/providers/${providerId}`,
    payload
  );

  return res.data;
};

export const uploadDisplayPicture = async (
  providerId: string,
  file: File
) => {

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const res = await api.post(
    `/providers/${providerId}/display-picture`,
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

// Cover/background photo shown behind the Portfolio gallery header.
// Backend endpoint (POST /providers/{id}/cover-image) already existed
// for the registration wizard's Tab 1 Business Information step, but
// was never surfaced anywhere a provider could revisit/change it -
// reusing it here rather than adding a new column/endpoint.
export const uploadCoverImage = async (
  providerId: string,
  file: File
) => {

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  const res = await api.post(
    `/providers/${providerId}/cover-image`,
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