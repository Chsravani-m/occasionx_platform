import { api } from "@/core/api/client";

export interface MonthlyEarnings {
  month: string;
  earnings: number;
  bookings: number;
}

export interface ProviderEarnings {
  total_earnings: number;
  confirmed_bookings: number;
  average_booking_value: number;
  awaiting_payment_amount: number;
  awaiting_payment_count: number;
  offline_earnings: number;
  offline_bookings: number;
  monthly: MonthlyEarnings[];
}

export async function getProviderEarnings(providerId: string) {
  const res = await api.get<ProviderEarnings>(
    `/bookings/provider/${providerId}/earnings`
  );
  return res.data;
}
