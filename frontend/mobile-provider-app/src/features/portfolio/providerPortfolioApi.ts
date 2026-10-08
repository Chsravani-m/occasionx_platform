import { api, API_GATEWAY_URL } from "@/core/api/client";

export type PortfolioMediaType = "IMAGE" | "VIDEO" | "ZIP";

export interface PortfolioItem {
  id: string;
  provider_id: string;
  title: string;
  description?: string;
  media_type: PortfolioMediaType;
  media_url: string;
}

// React Native's fetch/FormData implementation doesn't take a browser
// `File` object - it wants a plain { uri, name, type } descriptor, which
// is what expo-image-picker's result assets already look like.
export interface RNFile {
  uri: string;
  name: string;
  type: string;
}

export const uploadPortfolio = async (
  providerId: string,
  title: string,
  description: string,
  file: RNFile
): Promise<PortfolioItem> => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("description", description);
  // @ts-expect-error - RN's FormData accepts { uri, name, type } for
  // file fields, unlike the browser-only File/Blob typings TS expects.
  formData.append("file", { uri: file.uri, name: file.name, type: file.type });

  const res = await api.post(`/providers/${providerId}/portfolio`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getPortfolio = async (providerId: string): Promise<PortfolioItem[]> => {
  const res = await api.get(`/providers/${providerId}/portfolio`);
  return res.data;
};

export const deletePortfolio = async (portfolioId: string) => {
  await api.delete(`/providers/portfolio/${portfolioId}`);
};

// media_url comes back as a path relative to provider-service's own
// /uploads mount (e.g. "/uploads/portfolio/xyz.jpg"); the gateway now
// proxies that same path, so the whole app can stay on a single origin.
export const resolveMediaUrl = (mediaUrl: string) => `${API_GATEWAY_URL}${mediaUrl}`;
