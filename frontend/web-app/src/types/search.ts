export interface ProviderSearchRequest {
  state: string;
  district: string;
  location?: string;
  categoryId: number;
  subcategoryId?: number;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'BEST_MATCH' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING_DESC';
  page?: number;
  pageSize?: number;
}

export interface ProviderCardSummary {
  providerId: number;
  businessName: string;
  categoryName: string;
  subcategoryName?: string;
  locationLabel: string; // "Ameerpet, Hyderabad"
  rating: number;
  ratingCount: number;
  startingPrice: number;
  thumbnailUrl?: string;
  isInDeals: boolean;
}

export interface ProviderSearchResponse {
  results: ProviderCardSummary[];
  total: number;
  page: number;
  pageSize: number;
}
