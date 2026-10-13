import { api, setSession, clearSession, getStoredUser } from "@/core/api/client";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: "USER" | "PROVIDER" | "ADMIN" | "SUPER_ADMIN";
  isPaidMember?: boolean;
  // Only present for PROVIDER logins - the provider-service Provider
  // row's own id, which is what every provider-scoped endpoint
  // (/providers/dashboard/{id}, /providers/{id}/services, etc.)
  // actually expects. It's a *different* UUID from `id` above (that's
  // the auth-service User row) - every provider screen reads this via
  // `(user as any)?.provider_id || user?.id`, so it must survive
  // login and the AsyncStorage round-trip or those calls 404 against
  // the wrong id.
  provider_id?: string;
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

  // auth-service returns provider_id as a sibling of `user`, not
  // inside it - merge it in so it's actually available wherever the
  // app reads `user.provider_id` (and so it survives being persisted/
  // reloaded from AsyncStorage via setSession/getStoredUser).
  const user: AuthUser = { ...data.user, provider_id: data.provider_id };

  if (data.accessToken) {
    await setSession(data.accessToken, data.refreshToken, user);
  }

  return { ...data, user };
}

// Plain customer register() lives in mobile-customer-app - this app is
// provider-only, registration always goes through registerProvider()
// below.

export interface ProviderRegisterPayload {
  full_name: string;
  owner_name: string;
  business_name: string;
  email: string;
  phone: string;
  password: string;

  // Proof the phone above passed OTP verification - see
  // sendRegistrationOtp/verifyRegistrationOtp in
  // providerOnboardingApi.ts. Required by auth-service.
  phone_verification_token: string;

  // Business Location (Tab 3), Services (Tab 4) and everything after
  // are filled in via their own PATCH-style endpoints once the account
  // exists (see providerOnboardingApi.ts), so these are optional here -
  // mirrors web's ProviderRegisterRequest exactly.
  state_id?: number;
  district_id?: number;
  location_id?: number;
  category_id?: string;
  subcategory_id?: string;

  address?: string;
  gst_number?: string;
  description?: string;

  // Tab 1: Business Information
  legal_entity_name?: string;
  pan_number?: string;
  year_established?: number;
  business_registration_number?: string;
  entity_type?: string;

  // Tab 2: Contact Details
  contact_person?: string;
  whatsapp_number?: string;
  website_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
}

export interface ProviderRegisterResult {
  message: string;
  user_id: string;
  provider_id: string;
  // True when this call picked up an existing, never-finished
  // registration (same phone/email, fee unpaid, not yet activated)
  // instead of creating a brand new account.
  resuming?: boolean;
  // Short-lived token for finishing onboarding before activation - see
  // setOnboardingToken in core/api/client.ts.
  onboarding_token: string;
}

// Unlike the customer register() above, this creates the User *and*
// Provider rows in one call and does NOT log the provider in - no
// session tokens come back. The provider finishes onboarding (location,
// services, pricing, availability, KYC, documents, registration fee)
// with the returned onboarding_token, then can only sign in
// for real once they've clicked the activation link emailed after
// payment (see auth-service's login_user, which 401s with an "activate
// your account" message until then).
export async function registerProvider(payload: ProviderRegisterPayload) {
  const res = await api.post<ProviderRegisterResult>("/auth/register-provider", payload);
  return res.data;
}

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
