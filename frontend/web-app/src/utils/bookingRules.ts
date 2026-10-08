// Client-side mirror of services/booking-service/app/core/booking_rules.py.
// Booking notice is now set per-provider (in hours) and shown on the
// booking card / provider profile - see providerBookingPolicyApi.ts.
// This file only supplies the date-picker's min/max bounds (today ..
// +90 days, since same-day booking is allowed) and a client-side
// pre-check for whether a booking can still be cancelled. The backend
// (create_booking_api / cancel_booking_api) is still the actual source
// of truth and re-validates every request against the real event
// date+time.

export const MAX_BOOKING_WINDOW_DAYS = 90;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// YYYY-MM-DD string suitable for an <input type="date"> min attribute.
// Same-day booking is allowed - the provider's own notice-hours policy
// (checked against the exact event time) is what actually gates how
// soon today a booking can be made.
export function getEarliestBookableDate(): string {
  return toDateInputValue(new Date());
}

// YYYY-MM-DD string suitable for an <input type="date"> max attribute.
export function getLatestBookableDate(): string {
  return toDateInputValue(addDays(new Date(), MAX_BOOKING_WINDOW_DAYS));
}

// Whether a CONFIRMED/AWAITING_PAYMENT booking for eventDate/eventTime
// can still be cancelled - mirrors the backend's can_cancel_booking:
// allowed any time before the event itself has happened.
export function canCancelBooking(
  eventDate: string | Date,
  eventTime?: string | null
): boolean {
  const event = typeof eventDate === "string" ? new Date(eventDate) : new Date(eventDate);
  if (eventTime) {
    const [h, m] = eventTime.split(":").map((n) => parseInt(n, 10));
    event.setHours(isNaN(h) ? 23 : h, isNaN(m) ? 59 : m, 0, 0);
  } else {
    event.setHours(23, 59, 59, 999);
  }
  return event.getTime() > Date.now();
}
