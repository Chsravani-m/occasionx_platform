export interface PackageProvider {
  provider_id: string;
  provider_name: string;

  service_id: string;
  service_name: string;

  category_id?: string | null;
  category_name?: string | null;

  pricing_id?: string | null;
  price: number;
  pricing_type?: string | null;
  unit?: string | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  occupancy_per_room?: number | null;
  total_rooms?: number | null;

  rating: number;

  // Per-item quantity override (e.g. number of rooms for
  // Accommodation, or number of people for Makeup & Grooming) - set
  // when the customer customizes a category that needsPerItemQuantity.
  // Falls back to the overall guestCount when unset.
  quantity?: number;

  // Carried over from the provider details page when a customer picks
  // a date/guest count there and clicks "Add to Cart" instead of
  // booking immediately - lets the cart/BookingReview screen prefill
  // these instead of asking again from scratch.
  event_date?: string;
  event_time?: string;
  event_end_date?: string;
  guest_count?: number;
  notes?: string;
}

export interface PackageCategory {
  category_id: string;
  category_name?: string;

  required: boolean;

  providers: PackageProvider[];
}

export interface PackageSummary {
  id: string;

  name: string;
  description?: string;

  min_budget: number;
  max_budget: number;

  active: boolean;
}

export interface EventType {
  id: string;
  name: string;
}

export interface PackageBreakdown {
  category: string;
  cost: number;
}

export interface RecommendedPackage {

  package_id: string;

  package_name: string;

  estimated_cost: number;

  budget_fit: boolean;

  providers_count: number;

  breakdown: {
    category: string;
    cost: number;
  }[];
}