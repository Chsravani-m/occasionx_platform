export interface PricingPackage {
    id: string;
    pricing_type: string;
    amount: number;
    currency: string;
    unit?: string;
    min_quantity?: number;
    max_quantity?: number;
    occupancy_per_room?: number | null;
    total_rooms?: number | null;
}

export interface ProviderService {
    id: string;
    name: string;
    description?: string;
    category_id?: string;
    starting_price?: number;
    pricing: PricingPackage[];
}

export interface PortfolioItem {
    id: string;
    media_url: string;
    media_type: string;
    title?: string;
    description?: string;
}

export interface Provider {
    id: string;

    business_name: string;
    owner_name: string;

    email: string;
    phone: string;

    address?: string;
    description?: string;

    verification_status: string;

    state_id?: number;
    district_id?: number;
    location_id?: number;

    starting_price?: number;

    rating?: number;
    review_count?: number;

    // Provider-set booking notice (hours) + free-text cancellation
    // policy, shown to the customer before they book (see
    // services/providerBookingPolicyApi.ts).
    booking_notice_hours?: number;
    cancellation_policy?: string | null;
}

export interface ProviderDetails {

    provider: Provider;

    portfolio: PortfolioItem[];

    services: ProviderService[];

    starting_price?: number;

    rating: number;

    review_count: number;

}

export interface ProviderDashboard {
    provider_id: string;
    business_name: string;
    owner_name: string;

    email: string;
    phone: string;
    verification_status: string;
    display_picture_url?: string | null;
    cover_image_url?: string | null;

    documents_uploaded: number;
    services_count: number;
    portfolio_count: number;
    categories_count: number;

    pricing_completed: boolean;
    registration_fee_paid: boolean;
    registration_paid_at?: string;
    account_activated: boolean;
    onboarding_completed: boolean;
}