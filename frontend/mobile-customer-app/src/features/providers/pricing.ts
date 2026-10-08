// Mirrors web-app/src/utils/pricing.ts - kept in sync by hand since the
// two apps don't share a package. This was missing entirely from the
// mobile customer app (MC-15 test failure): without it, Accommodation
// (PER_DAY) services had no check-out date / room-quantity handling at
// all, so bookings priced wrong and the review screen never sent
// event_end_date/quantity to POST /bookings.

// Platform-wide cap on guests per room for Accommodation bookings -
// enforced at booking time even if a provider's pricing row doesn't
// specify its own (lower) occupancy_per_room.
export const MAX_GUESTS_PER_ROOM = 4;

// Platform-wide cap on the "number of people" a per-person service
// like Makeup & Grooming can be customized for.
export const MAX_PEOPLE_QUANTITY = 10;

export function isPerUnitPricing(pricingType?: string | null): boolean {
  return pricingType === "PER_PLATE" || pricingType === "PER_PERSON";
}

export function getEffectiveQuantity(
  guestCount?: number,
  minQuantity?: number | null,
  maxQuantity?: number | null
): number {
  let quantity = guestCount ?? 0;

  if (maxQuantity != null) {
    quantity = Math.min(quantity, maxQuantity);
  }

  if (minQuantity != null) {
    quantity = Math.max(quantity, minQuantity);
  }

  return quantity;
}

/**
 * Number of nights between a check-in and check-out date, the way a
 * hotel/accommodation stay is billed (19th -> 20th = 1 night, not 2).
 * Falls back to 1 whenever there's no valid range, so a single-date
 * booking (or an unset check-out) still prices as one night/day.
 */
export function calculateNumDays(
  startDate?: string | null,
  endDate?: string | null
): number {
  if (!startDate || !endDate) return 1;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffMs = end.getTime() - start.getTime();

  if (Number.isNaN(diffMs)) return 1;

  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 1;
}

const ACCOMMODATION_CATEGORY_NAME = "Accommodation";
const GROOMING_CATEGORY_KEYWORDS = ["makeup", "grooming"];

interface ServiceLike {
  pricing_type?: string | null;
  category_name?: string | null;
}

export function isAccommodationService(service: ServiceLike): boolean {
  return (
    service.pricing_type === "PER_DAY" &&
    service.category_name === ACCOMMODATION_CATEGORY_NAME
  );
}

export function isGroomingService(service: ServiceLike): boolean {
  const name = service.category_name?.toLowerCase() || "";

  return (
    isPerUnitPricing(service.pricing_type) &&
    GROOMING_CATEGORY_KEYWORDS.some((keyword) => name.includes(keyword))
  );
}

export function suggestedQuantityFor(
  categoryName?: string | null,
  guestCount?: number,
  occupancyPerRoom?: number | null,
  minQuantity?: number | null
): number {
  const lower = (categoryName || "").toLowerCase();

  if (lower.includes("accommodation")) {
    const occupancy = occupancyPerRoom || MAX_GUESTS_PER_ROOM;

    return Math.max(1, Math.ceil((guestCount || 1) / occupancy));
  }

  return Math.min(MAX_PEOPLE_QUANTITY, Math.max(1, minQuantity || 1));
}

export function calculateEstimatedCost(
  price: number,
  pricingType?: string | null,
  guestCount?: number,
  minQuantity?: number | null,
  maxQuantity?: number | null,
  numDays?: number,
  quantity?: number
): number {
  if (isPerUnitPricing(pricingType)) {
    const basis = quantity ?? guestCount;

    if (!basis) return price;

    return price * getEffectiveQuantity(basis, minQuantity, maxQuantity);
  }

  if (pricingType === "PER_DAY") {
    return price * (quantity || 1) * (numDays || 1);
  }

  if (pricingType === "HOURLY") {
    return price * 6;
  }

  return price;
}
