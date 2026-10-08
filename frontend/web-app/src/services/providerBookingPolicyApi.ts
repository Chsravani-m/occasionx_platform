import { api } from "@/lib/apiClient";

// Replaces the old platform-wide category-tier day-based booking-notice
// rule - each provider now sets their own minimum notice (in hours) and
// a free-text cancellation policy, shown to customers on the provider's
// profile like a short terms-and-conditions clause.
export interface BookingPolicy {
  booking_notice_hours: number;
  cancellation_policy?: string | null;
}

export interface BookingPolicyUpdatePayload {
  booking_notice_hours: number;
  cancellation_policy?: string | null;
}

export const getBookingPolicy = async (
  providerId: string
): Promise<BookingPolicy> => {
  const res = await api.get(`/providers/${providerId}/booking-policy`);

  return res.data;
};

export const updateBookingPolicy = async (
  providerId: string,
  payload: BookingPolicyUpdatePayload
): Promise<BookingPolicy> => {
  const res = await api.put(
    `/providers/${providerId}/booking-policy`,
    payload
  );

  return res.data;
};
