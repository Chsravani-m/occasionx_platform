import { api } from "@/core/api/client";

// Mirrors web-app/src/services/profileApi.ts - separate from AuthUser
// (authApi.ts), which only carries the small set of fields returned at
// login. This is the fuller "personal information" profile record
// (user-service's UserProfile), fetched/edited lazily from the Profile
// tab rather than on every screen.
export interface UserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  bio?: string;
  profile_image_url?: string;
}

export async function getProfile(): Promise<UserProfile> {
  const res = await api.get("/users/profile");
  return res.data;
}

export async function updateProfile(data: UserProfile): Promise<UserProfile> {
  const res = await api.put("/users/profile", data);
  return res.data;
}
