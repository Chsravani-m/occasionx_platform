// Platform-wide cap on guests per room for Accommodation bookings -
// enforced at booking time even if a provider's pricing row doesn't
// specify its own (lower) occupancy_per_room.
export const MAX_GUESTS_PER_ROOM = 4;

// Platform-wide cap on the "number of people" a per-person service
// like Makeup & Grooming can be customized for. Unlike Accommodation
// rooms (which should scale with a large guest list), a grooming
// booking realistically only ever covers a handful of people, so the
// input is capped rather than left open-ended.
export const MAX_PEOPLE_QUANTITY = 10;

// Mirrors BOOKING_CHARGE_AMOUNT_PAISE in
// services/booking-service/app/crud/booking_charge.py (Rs.99). Charged
// per service being booked, not a flat one-time amount. Used here only
// to show an accurate estimated total on the review page before
// checkout - the backend is always the source of truth for what's
// actually charged.
export const BOOKING_CHARGE_AMOUNT = 99;

const PRICING_TYPE_LABELS: Record<string, string> = {
  PER_PLATE: "per plate",
  PER_PERSON: "per person",
  FIXED: "fixed price",
  PACKAGE: "package price",
  HOURLY: "per hour",
  PER_DAY: "per day",
};

export function formatPricingType(
  pricingType?: string | null
): string {
  if (!pricingType) return "";

  return (
    PRICING_TYPE_LABELS[pricingType] ||
    pricingType.toLowerCase().replace(/_/g, " ")
  );
}

export function isPerUnitPricing(
  pricingType?: string | null
): boolean {
  return (
    pricingType === "PER_PLATE" ||
    pricingType === "PER_PERSON"
  );
}

export function isRatePricing(
  pricingType?: string | null
): boolean {
  return (
    pricingType === "PER_PLATE" ||
    pricingType === "PER_PERSON" ||
    pricingType === "HOURLY" ||
    pricingType === "PER_DAY"
  );
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

// Categories where the overall event guest count is the WRONG basis
// for pricing - not every guest needs a hotel room or a makeup
// session. Matched by substring (case-insensitive) so admin-named
// variants like "Makeup & Grooming" or a standalone "Grooming"
// category all qualify.
const PER_ITEM_QUANTITY_KEYWORDS = ["accommodation", "makeup", "grooming"];

export function needsPerItemQuantity(
  categoryName?: string | null
): boolean {
  if (!categoryName) return false;

  const lower = categoryName.toLowerCase();

  return PER_ITEM_QUANTITY_KEYWORDS.some((keyword) =>
    lower.includes(keyword)
  );
}

// Shared with BookingReview.tsx and CartPage.tsx so both agree on
// which services get a Rooms input vs a People input vs neither -
// previously duplicated locally in BookingReview.tsx.
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

export function quantityLabelFor(categoryName?: string | null): string {
  const lower = (categoryName || "").toLowerCase();

  return lower.includes("accommodation") ? "Rooms" : "People";
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
    // A per-item quantity (e.g. "number of people getting makeup" for
    // a Makeup & Grooming service) overrides the overall event guest
    // count - not everyone at the event needs that service. Falls
    // back to guestCount when no override is given, same as before.
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
