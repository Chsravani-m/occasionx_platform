import { api } from "@/lib/apiClient";

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

export interface CreateReviewPayload {
  booking_id: string;
  customer_id: string;
  rating: number;
  comment?: string;
}

export const createReview = async (
  payload: CreateReviewPayload
): Promise<Review> => {
  const res = await api.post("/bookings/review", payload);

  return res.data;
};

export const getBookingReview = async (
  bookingId: string
): Promise<Review | null> => {
  const res = await api.get(`/bookings/${bookingId}/review`);

  return res.data;
};

export const getProviderReviews = async (
  providerId: string
): Promise<Review[]> => {
  const res = await api.get(`/bookings/provider/${providerId}/reviews`);

  return res.data;
};

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
}

export const getReviewStats = async (): Promise<ReviewStats> => {
  const res = await api.get("/bookings/reviews/stats");

  return res.data;
};
