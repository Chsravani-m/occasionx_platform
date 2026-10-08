import { api } from "../lib/apiClient";


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
  // The event's start time (HH:MM, 24h) - required for new online
  // bookings so the provider's own booking_notice_hours can be
  // checked against the real event date+time. Missing on older/
  // offline bookings.
  event_time?: string;
  event_end_date?: string;

  quantity?: number;

  guest_count: number;

  notes?: string;

  booking_status: string;

  created_at: string;

  // "ONLINE" (booked through OccasionX) or "OFFLINE" (provider logged
  // a job they did outside the platform). Missing/undefined means
  // ONLINE for older records.
  source?: "ONLINE" | "OFFLINE";

  payment_date?: string;

  payment_method?: string;
  payment_type?: "ADVANCE" | "FULL";
  amount_paid?: number;

  // This booking's own share of the OX application fee, when a free
  // member's payment folded it into the same combined order as the
  // provider's fee. Undefined/0 for paid members and bookings that
  // never carried the fee.
  application_fee?: number;
}

export interface OfflineBookingPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;

  service_name: string;

  event_date: string;
  event_end_date?: string;
  payment_date?: string;

  amount: number;

  payment_method?: string;
  payment_type?: "ADVANCE" | "FULL";
  amount_paid?: number;

  guest_count?: number;

  notes?: string;
}

export interface PaginatedBookings {
  items: Booking[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BookingStats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  rejected_bookings: number;
  total_revenue: number;
}

export interface CreateBookingPayload {
  customer_id: string;

  provider_id: string;

  service_id: string;

  pricing_id: string;

  event_date: string;
  // Required - the provider's own booking_notice_hours is checked
  // against event_date + event_time (see booking-service's
  // app/core/booking_rules.py).
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

export function formatBookingDates(booking: Booking): string {
  if (!booking.event_end_date || booking.event_end_date === booking.event_date) {
    return booking.event_date;
  }

  return `${booking.event_date} → ${booking.event_end_date}`;
}

export async function createBooking(
  payload: CreateBookingPayload
) {
  const res = await api.post<Booking>(
    "/bookings",
    payload
  );

  return res.data;
}

export async function getCustomerBookings(
  customerId: string
) {
  const res = await api.get<Booking[]>(
  `/bookings/customer/${customerId}`
);

return res.data;
}

export async function getProviderBookings(
  providerId: string
) {
  const res = await api.get<Booking[]>(
  `/bookings/provider/${providerId}`
);

return res.data;
}

export async function getProviderBookingsPaged(
  providerId: string,
  page: number,
  pageSize: number
) {
  const res = await api.get<PaginatedBookings>(
    `/bookings/provider/${providerId}/paged`,
    {
      params: { page, page_size: pageSize },
    }
  );

  return res.data;
}

export async function createOfflineBooking(
  providerId: string,
  payload: OfflineBookingPayload
) {
  const res = await api.post<Booking>(
    `/bookings/provider/${providerId}/offline`,
    payload
  );

  return res.data;
}

export async function getAllBookings(
  limit?: number
) {
  const res = await api.get<Booking[]>(
    "/bookings",
    {
      params: limit ? { limit } : undefined,
    }
  );

  return res.data;
}

export async function getBookingStats() {
  const res = await api.get<BookingStats>(
    "/bookings/stats"
  );

  return res.data;
}

export async function updateBookingStatus(
  bookingId: string,
  status: string
) {
  const res = await api.patch(
    `/bookings/${bookingId}/status`,
    {
      booking_status: status,
    }
  );

  return res.data;
}

// Customer-initiated cancellation - distinct from updateBookingStatus,
// which is provider/admin-only. Backend enforces the actual cutoff
// (see bookingRules.ts for the same rule mirrored client-side to
// gate/hide the button); this call still 400s if the cutoff has
// passed since the page could be stale.
export async function cancelBooking(
  bookingId: string
) {
  const res = await api.post<Booking>(
    `/bookings/${bookingId}/cancel`
  );

  return res.data;
}