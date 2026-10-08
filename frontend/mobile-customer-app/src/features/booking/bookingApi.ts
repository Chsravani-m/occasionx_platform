import { api } from "@/core/api/client";

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  provider_name?: string;
  service_name?: string;
  package_name?: string;
  category_name?: string;
  amount?: number;
  service_id?: string;
  pricing_id?: string;
  event_date: string;
  event_time?: string;
  event_end_date?: string;
  quantity?: number;
  guest_count: number;
  notes?: string;
  booking_status: string;
  created_at: string;
  source?: "ONLINE" | "OFFLINE";
  payment_date?: string;
  payment_method?: string;
  payment_type?: "ADVANCE" | "FULL";
  amount_paid?: number;
  // This booking's own share of the OX application fee when a free
  // member's payment folded it into the combined order.
  application_fee?: number;
}

export interface CreateBookingPayload {
  customer_id: string;
  provider_id: string;
  service_id: string;
  pricing_id: string;
  event_date: string;
  event_time: string;
  event_end_date?: string;
  quantity?: number;
  guest_count: number;
  notes?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  provider_name?: string;
  service_name?: string;
  package_name?: string;
  category_name?: string;
  amount?: number;
}

export async function createBooking(payload: CreateBookingPayload) {
  const res = await api.post<Booking>("/bookings", payload);
  return res.data;
}

export async function getCustomerBookings(customerId: string) {
  const res = await api.get<Booking[]>(`/bookings/customer/${customerId}`);
  return res.data;
}

export async function getProviderBookings(providerId: string) {
  const res = await api.get<Booking[]>(`/bookings/provider/${providerId}`);
  return res.data;
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const res = await api.patch(`/bookings/${bookingId}/status`, {
    booking_status: status,
  });
  return res.data;
}

// Customer-initiated cancellation - the backend enforces the actual
// cancellation cutoff (see bookingRules.ts for the same rule mirrored
// client-side to gate/hide the button).
export async function cancelBooking(bookingId: string) {
  const res = await api.post<Booking>(`/bookings/${bookingId}/cancel`);
  return res.data;
}
