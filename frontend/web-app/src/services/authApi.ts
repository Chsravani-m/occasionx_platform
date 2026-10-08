import { api } from '../lib/apiClient';
import type { ApiResponse } from '../types/base';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: 'USER' | 'PROVIDER' | 'ADMIN' | 'SUPER_ADMIN';
  
  vendorType?:
    | 'SINGLE_CATEGORY'
    | 'MULTI_CATEGORY'
    | 'OCCASION_PACKAGE';

    isPremium?: boolean;

  // True once the user has paid the one-time paid-membership fee -
  // set from the register form's "paid user" checkbox flow. Paid
  // members skip the per-booking service charge free users pay.
  isPaidMember?: boolean;
}


export interface LoginResult {

  accessToken: string;
  refreshToken: string;
  provider_id?: string;
  user: AuthUser;
}

export async function register(fullName: string, email: string, mobile: string, password: string) {
  const res = await api.post<ApiResponse<{ userId: string }>>('/auth/register', {
      full_name: fullName,
      phone: mobile,
      email,
      password,
    }
  );
  return res.data;
}

export async function login(
  identifier: string,
  password: string
) {

  const res = await api.post<LoginResult>(
    "/auth/login",
    {
      identifier,
      password,
    }
  );

  const data = res.data;
  console.log("LOGIN DATA =", data);

  if (data.accessToken) {

  localStorage.setItem(
    "accessToken",
    data.accessToken
  );

  localStorage.setItem(
    "refreshToken",
    data.refreshToken
  );

  localStorage.setItem(
    "user",
    JSON.stringify(data.user)
  );

  if (data.provider_id) {

    localStorage.setItem(
      "provider_id",
      data.provider_id
    );

  }
}
  return data;
}

export async function forgotPassword(email: string) {
  const res = await api.post<{ message: string }>(
    "/auth/forgot-password",
    { email }
  );

  return res.data;
}

export async function resetPassword(
  token: string,
  newPassword: string
) {
  const res = await api.post<{ message: string }>(
    "/auth/reset-password",
    {
      token,
      new_password: newPassword,
    }
  );

  return res.data;
}

export async function fetchMe() {

  const token = localStorage.getItem("accessToken");

  const res = await api.get(
    "/auth/me",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return res.data;
}
