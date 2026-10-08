// Client-side mirror of services/booking-service/app/core/booking_rules.py
// (see frontend/web-app/src/utils/bookingRules.ts for the same logic on
// the web app). Booking notice is now set per-provider (in hours) and
// shown on the provider details screen - see providerBookingPolicyApi.ts.
// This file only supplies the date picker's minimumDate/maximumDate
// (today .. +90 days, since same-day booking is allowed) and a
// client-side pre-check for whether a booking can still be cancelled.
// The backend (create_booking_api / cancel_booking_api) is still the
// actual source of truth and re-validates every request against the
// real event date+time.

export const MAX_BOOKING_WINDOW_DAYS = 90;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Date object suitable for a DateTimePicker's minimumDate. Same-day
// booking is allowed - the provider's own notice-hours policy (checked
// against the exact event time) is what actually gates how soon today.
export function getEarliestBookableDate(): Date {
  return new Date();
}

// Date object suitable for a DateTimePicker's maximumDate.
export function getLatestBookableDate(): Date {
  return addDays(new Date(), MAX_BOOKING_WINDOW_DAYS);
}

// Whether a PENDING/AWAITING_PAYMENT/CONFIRMED booking for
// eventDate/eventTime can still be cancelled today - mirrors the
// backend's can_cancel_booking: allowed any time before the event
// itself has happened.
export function canCancelBooking(eventDate: string | Date, eventTime?: string | null): boolean {
  const event = typeof eventDate === "string" ? new Date(eventDate) : new Date(eventDate);
  if (eventTime) {
    const [h, m] = eventTime.split(":").map((n) => parseInt(n, 10));
    event.setHours(isNaN(h) ? 23 : h, isNaN(m) ? 59 : m, 0, 0);
  } else {
    event.setHours(23, 59, 59, 999);
  }
  return event.getTime() > Date.now();
}
