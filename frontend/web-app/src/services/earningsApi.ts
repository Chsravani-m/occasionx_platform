import { api } from "../lib/apiClient";

// OccasionX takes no commission and never holds or pays out provider
// funds - customers pay providers directly. This is purely a
// read-only view of a provider's own booking revenue, built from
// their booking history.

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

export async function getProviderEarnings(
  providerId: string
) {
  const res = await api.get<ProviderEarnings>(
    `/bookings/provider/${providerId}/earnings`
  );

  return res.data;
}
