import { api } from "@/core/api/client";

// Mirrors frontend/web-app/src/services/reviewApi.ts's getProviderReviews -
// same /bookings/provider/{providerId}/reviews endpoint (booking-service,
// already proxied through api-gateway). This app only needs the read side
// (a provider views what customers said); creating a review is a
// customer-side action.
export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  service_id: string | null;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  service_name: string | null;
  created_at: string;
}

export async function getProviderReviews(providerId: string): Promise<Review[]> {
  const res = await api.get(`/bookings/provider/${providerId}/reviews`);
  return res.data;
}
