import { API_GATEWAY_URL } from "./apiClient";
export function getImageUrl(
  path?: string
) {
  if (!path) {
    return "/provider-placeholder.jpg";
  }

  if (path.startsWith("http")) {
    return path;
  }

  return `${API_GATEWAY_URL}${path}`;
}