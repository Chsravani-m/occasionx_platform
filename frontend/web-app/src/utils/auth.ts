export function getCurrentUser() {

  if (typeof window === "undefined") {
    return null;
  }

  const user = localStorage.getItem("user");

  return user ? JSON.parse(user) : null;
}

export function getRole() {

  return getCurrentUser()?.role;
}

export function isAdmin() {

  return getRole() === "ADMIN";
}

export function isVendor() {

  return getRole() === "VENDOR";
}

export function isUser() {

  return getRole() === "USER";
}

// True once the current user has paid the one-time paid-membership
// fee. Free (non-paid) users pay a per-booking service charge
// instead - see bookingChargeApi.ts.
export function isPaidMember() {

  return !!getCurrentUser()?.isPaidMember;
}

export function isAuthenticated() {

  if (typeof window === "undefined") {
    return false;
  }

  return !!localStorage.getItem("accessToken");
}

export function logout() {

  localStorage.clear();

  window.location.href = "/login";
}