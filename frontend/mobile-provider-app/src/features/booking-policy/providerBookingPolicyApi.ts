import { api } from "@/core/api/client";

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
  const res = await api.put(`/providers/${providerId}/booking-policy`, payload);
  return res.data;
};
