import axios from "axios";

export const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY ||
  "http://localhost:8000";

export const api = axios.create({
  baseURL: API_GATEWAY_URL,
});

// Limited token returned by POST /auth/register-provider. A new
// provider can't log in until their registration fee is paid and the
// account is activated, so the registration wizard uses this token to
// save the remaining steps and pay the fee. The backend only accepts it
// for that provider's own onboarding endpoints.
export const ONBOARDING_TOKEN_KEY = "providerOnboardingToken";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem(ONBOARDING_TOKEN_KEY)
  );
}

// For the few places that call the API with fetch() instead of `api`.
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// The access token is short-lived (~30 min) by design on the backend
// (auth-service's create_access_token). Without this, every request
// made after expiry 401s with "Invalid or expired token" until the
// user manually signs out and back in - e.g. the wishlist count call
// in Header.tsx. The backend already exposes POST /auth/refresh
// (services/auth-service); this app never called it before. Mirrors
// the same fix already shipped in both mobile apps' api/client.ts.
export const SESSION_EXPIRED_EVENT = "session-expired";

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem("refreshToken")
      : null;

  if (!refreshToken) return null;

  try {
    // Plain axios call, not the `api` instance - going through `api`
    // would re-enter this same response interceptor.
    const res = await axios.post(`${API_GATEWAY_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    // Refresh returns snake_case fields (access_token/refresh_token),
    // unlike login's camelCase (accessToken/refreshToken) - and the
    // old refresh token is revoked server-side on use, so the new one
    // must be persisted too or the next refresh will fail.
    const { access_token, refresh_token } = res.data;
    localStorage.setItem("accessToken", access_token);
    localStorage.setItem("refreshToken", refresh_token);
    return access_token as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const isAuthEndpoint =
      config?.url?.includes("/auth/refresh") || config?.url?.includes("/auth/login");

    if (
      typeof window === "undefined" ||
      response?.status !== 401 ||
      !config ||
      config._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }
    config._retry = true;

    // Multiple 401s can land at once (e.g. Header.tsx firing several
    // requests together) - share one in-flight refresh instead of
    // racing several refresh calls, which would revoke each other's
    // refresh token.
    if (!refreshInFlight) {
      refreshInFlight = performRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    const newAccessToken = await refreshInFlight;

    if (!newAccessToken) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      return Promise.reject(error);
    }

    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(config);
  }
);

export default api;
// KYC documents (/uploads/provider-documents/...) need the login token,
// so they can't be opened with a plain <a href>. Fetches the file with
// the token and opens it in a new tab.
export async function openProtectedFile(path: string): Promise<void> {
  // Opened before the request so the browser doesn't treat it as an
  // unrequested popup.
  const tab = window.open("", "_blank");

  try {
    const res = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);

    if (tab) {
      tab.location.href = url;
    } else {
      window.location.href = url;
    }

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
