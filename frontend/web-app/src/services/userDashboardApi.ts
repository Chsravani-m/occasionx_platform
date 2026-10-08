import { api } from "../lib/apiClient";
import type { ApiResponse } from "../types/base";

export interface BookingSummary {
  id: number;
  providerName: string;
  eventTitle: string;
  eventDate: string;
  status: string;
  locationLabel: string;
  ratingValue?: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
}

export interface SubmitRatingPayload {
  bookingId: number;
  providerId: number;
  ratingValue: number;
  reviewTitle?: string;
  reviewText?: string;
}

export async function getUserBookings() {
  const res = await api.get<ApiResponse<BookingSummary[]>>("/users/me/bookings");
  return res.data.data;
}

export async function getUserCalendar() {
  const res = await api.get<ApiResponse<CalendarEvent[]>>("/users/me/calendar");
  return res.data.data;
}

export async function submitRating(data: SubmitRatingPayload) {
  const res = await api.post<ApiResponse<any>>("/ratings", data);
  return res.data.data;
}
