import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Same api-gateway the web app talks to (services/api-gateway). No
// backend changes needed - the gateway is already API-first and
// serves both clients identically.
//
// On a real device (Expo Go) "localhost" means the phone itself, not
// your dev machine, so this needs to be your machine's LAN IP when
// testing on hardware - e.g. http://192.168.1.23:8000. Set it via
// app.json's expo.extra.apiGatewayUrl, or override at runtime with
// EXPO_PUBLIC_API_GATEWAY_URL.
// app.json's expo.extra.apiGatewayUrl is "http://10.0.2.2:8000" - that's
// the Android emulator's alias for the host machine's localhost, and only
// resolves inside the emulator. It's unreachable from a real browser
// (`expo start --web`), so web always prefers localhost over that config
// value; native platforms are unaffected and keep using the emulator/LAN
// value from app.json exactly as before.
export const API_GATEWAY_URL =
  process.env.EXPO_PUBLIC_API_GATEWAY_URL ||
  (Platform.OS === "web" ? "http://localhost:8000" : undefined) ||
  (Constants.expoConfig?.extra?.apiGatewayUrl as string | undefined) ||
  "http://localhost:8000";

// The Next.js web app's own origin - only needed for the handful of
// places the app links out to a web-only page (e.g. the Provider
// Terms & Conditions document opened in an in-app browser during
// provider registration). Same LAN-IP caveat as API_GATEWAY_URL.
export const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL ||
  (Platform.OS === "web" ? "http://localhost:3000" : undefined) ||
  (Constants.expoConfig?.extra?.webAppUrl as string | undefined) ||
  "http://localhost:3000";

// Only used for the live (non-test-mode) Razorpay checkout on the
// provider registration-fee screen - provider-service's
// registration-payment endpoint doesn't return a key_id the way
// booking-service's order-creation endpoints do, so this mirrors how
// the web app reads it from its own NEXT_PUBLIC_RAZORPAY_KEY env var.
// Unused whenever PAYMENT_TEST_MODE is on (the project's current
// default), since that path skips checkout.js entirely.
export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
  (Constants.expoConfig?.extra?.razorpayKeyId as string | undefined) ||
  "";

export const api = axios.create({
  baseURL: API_GATEWAY_URL,
});

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

// expo-secure-store only accepts alphanumeric/./-/_ keys and has a
// value size limit that's fine for tokens but not for a whole user
// object on some platforms - AsyncStorage is used for the (non
// sensitive) cached user object instead, SecureStore only for the
// tokens themselves.
import AsyncStorage from "@react-native-async-storage/async-storage";

// expo-secure-store has no web implementation (SecureStore.getItemAsync
// throws "getValueWithKeyAsync is not a function" in a browser), which
// crashes this app on launch when run via `expo start --web` - AuthContext
// calls getAccessToken() on mount before anything else renders. AsyncStorage
// already ships a working web implementation (backed by localStorage, same
// as USER_KEY already uses above), so tokens fall back to it on web; native
// platforms keep using the OS keychain via SecureStore exactly as before.
const secureSet = (key: string, value: string) =>
  Platform.OS === "web" ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
const secureGet = (key: string) =>
  Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
const secureDelete = (key: string) =>
  Platform.OS === "web" ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);

export async function setSession(
  accessToken: string,
  refreshToken: string,
  user: unknown
) {
  await secureSet(ACCESS_TOKEN_KEY, accessToken);
  await secureSet(REFRESH_TOKEN_KEY, refreshToken);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getAccessToken() {
  return secureGet(ACCESS_TOKEN_KEY);
}

// Limited token returned by POST /auth/register-provider. The provider
// can't sign in until the registration fee is paid and the account is
// activated, so the registration wizard uses this to save the remaining
// steps and pay the fee. The backend accepts it only for that
// provider's own onboarding endpoints.
const ONBOARDING_TOKEN_KEY = "providerOnboardingToken";

export async function setOnboardingToken(token: string) {
  await secureSet(ONBOARDING_TOKEN_KEY, token);
}

export async function clearOnboardingToken() {
  await secureDelete(ONBOARDING_TOKEN_KEY);
}

export async function getStoredUser<T = any>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function clearSession() {
  await secureDelete(ONBOARDING_TOKEN_KEY);
  await secureDelete(ACCESS_TOKEN_KEY);
  await secureDelete(REFRESH_TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function getRefreshToken() {
  return secureGet(REFRESH_TOKEN_KEY);
}

// RN equivalent of a "you got signed out" broadcast - AuthContext
// listens for this (DeviceEventEmitter has no window/localStorage
// event equivalent) and clears its in-memory user so RootNavigator
// drops back to the sign-in screen once a refresh attempt fails for
// good (expired/revoked refresh token, no network, etc.).
import { DeviceEventEmitter } from "react-native";
export const SESSION_EXPIRED_EVENT = "session-expired";

api.interceptors.request.use(async (config) => {
  const token =
    (await getAccessToken()) || (await secureGet(ONBOARDING_TOKEN_KEY));
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The access token is short-lived (~30 min) by design on the backend.
// Without this, every request made after expiry 401s with "Invalid or
// expired token" until the user manually signs out and back in - which
// is exactly the bug reported from the cart's wishlist button. The
// backend already exposes POST /auth/refresh (services/auth-service);
// neither this app nor the web app called it before this fix.
let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
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
    await secureSet(ACCESS_TOKEN_KEY, access_token);
    await secureSet(REFRESH_TOKEN_KEY, refresh_token);
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

    if (response?.status !== 401 || !config || config._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }
    config._retry = true;

    // Multiple 401s can land at once (e.g. a screen firing several
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
      await clearSession();
      DeviceEventEmitter.emit(SESSION_EXPIRED_EVENT);
      return Promise.reject(error);
    }

    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(config);
  }
);

export default api;
