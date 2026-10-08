import { api, setSession, clearSession, getStoredUser } from "@/core/api/client";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: "USER" | "PROVIDER" | "ADMIN" | "SUPER_ADMIN";
  isPaidMember?: boolean;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  provider_id?: string;
  user: AuthUser;
}

// Backend expects "identifier" (email or mobile), not "email" - see
// auth-service/app/api/auth.py.
export async function login(identifier: string, password: string) {
  const res = await api.post<LoginResult>("/auth/login", {
    identifier,
    password,
  });

  const data = res.data;

  if (data.accessToken) {
    await setSession(data.accessToken, data.refreshToken, data.user);
  }

  return data;
}

export async function register(
  fullName: string,
  email: string,
  mobile: string,
  password: string
) {
  const res = await api.post("/auth/register", {
    full_name: fullName,
    phone: mobile,
    email,
    password,
  });
  return res.data;
}

// Provider registration lives in the separate mobile-provider-app -
// this app is customer-only, so registerProvider() isn't ported here.

export async function fetchMe() {
  const res = await api.get("/auth/me");
  return res.data;
}

export async function logout() {
  await clearSession();
}

export async function getCurrentUser() {
  return getStoredUser<AuthUser>();
}

export function isPaidMember(user: AuthUser | null) {
  return !!user?.isPaidMember;
}
