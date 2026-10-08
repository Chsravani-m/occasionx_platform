import { api } from "../lib/apiClient";
import type { ApiResponse } from "../types/base";

export interface Rating {
  id: number;
  bookingId: number;
  providerId: number;
  ratingValue: number;
  reviewTitle?: string;
  reviewText?: string;
}

export interface CreateRatingPayload {
  bookingId: number;
  providerId: number;
  ratingValue: number;
  reviewTitle?: string;
  reviewText?: string;
}

export async function submitRating(payload: CreateRatingPayload) {
  const res = await api.post<ApiResponse<Rating>>("/ratings", payload);
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Rating failed");
  }
  return res.data.data;
}
