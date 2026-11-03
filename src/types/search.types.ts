import { WorkerNearby } from './worker.types';

/**
 * Search Service v1.2.0 Sort Options
 * Note: 'distance' requires lat, lng, and radius to be provided together.
 */
export type SearchSortOption =
  | 'relevance'
  | 'rating'
  | 'price_low'
  | 'price_high'
  | 'distance';

export type SortOption = SearchSortOption;

export type ProviderTypeFilter = 'ANY' | 'ALL' | 'INDIVIDUAL' | 'COMPANY';

export type TrendingWindow = '24h' | '7d';

export interface FilterState {
  categories: string[];
  categoryId?: string | undefined;
  categoryLabel?: string | undefined;
  city?: string | undefined;
  minRating: number;
  minRate: number;
  maxRate: number;
  sortBy: SortOption;
  available: 'any' | 'now' | 'today';
  radius?: number | undefined;
  provider_type?: ProviderTypeFilter | undefined;
}

export const DEFAULT_FILTERS: FilterState = {
  categories: [],
  categoryId: undefined,
  categoryLabel: undefined,
  city: undefined,
  minRating: 0,
  minRate: 0,
  maxRate: 0,
  sortBy: 'relevance',
  available: 'any',
  radius: 10000,
  provider_type: 'ALL',
};

/**
 * Search Service v1.2.0 Query Parameters (`GET /api/v1/search/workers`)
 */
export interface SearchWorkersParams {
  /** Free-text query (1..100 chars). Supports English, Urdu, Roman Urdu & typos */
  q?: string | undefined;
  /** Category UUID or slug matching ^[A-Za-z0-9_-]{1,50}$ */
  category_id?: string | undefined;
  /** Legacy alias for category_id */
  category?: string | undefined;
  /** Case-insensitive city filter (e.g. 'Lahore', 'Faisalabad', 'Karachi', 'Islamabad') */
  city?: string | undefined;
  /** Minimum service offering price in PKR (0..10,000,000) */
  min_price?: number | undefined;
  /** Legacy alias for min_price */
  minRate?: number | undefined;
  /** Maximum service offering price in PKR (0..10,000,000, >= min_price) */
  max_price?: number | undefined;
  /** Legacy alias for max_price */
  maxRate?: number | undefined;
  /** Minimum average star rating (0..5) */
  min_rating?: number | undefined;
  /** Legacy alias for min_rating */
  minRating?: number | undefined;
  /** Latitude (-90..90). Must be passed together with lng & radius */
  lat?: number | undefined;
  /** Longitude (-180..180). Must be passed together with lat & radius */
  lng?: number | undefined;
  /** Search radius in meters (1..50,000). Must be passed together with lat & lng */
  radius?: number | undefined;
  /** Sort order: 'relevance' | 'rating' | 'price_low' | 'price_high' | 'distance' */
  sort?: SearchSortOption | undefined;
  /** Legacy alias for sort */
  sortBy?: SortOption | undefined;
  /** Provider type filter: 'INDIVIDUAL' | 'COMPANY' | 'ANY' */
  provider_type?: 'INDIVIDUAL' | 'COMPANY' | 'ANY' | 'ALL' | undefined;
  /** Legacy availability filter */
  available?: string | undefined;
  /** Page number (1..50) */
  page?: number | undefined;
  /** Page size (1..20) */
  limit?: number | undefined;
}

export type SearchParams = SearchWorkersParams;

/**
 * Raw SearchDocument returned by `GET /api/v1/search/workers`
 */
export interface WorkerSearchDocument {
  worker_id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  category_ids: string[];
  category_names: string[];
  min_price: number | null;
  max_price: number | null;
  avg_rating: number;
  total_reviews: number;
  total_bookings: number;
  is_verified: boolean;
  is_available: boolean;
  is_busy: boolean;
  response_time_mins: number;
  badges: string[];
  is_featured: boolean;
  provider_type: 'INDIVIDUAL' | 'COMPANY';
  business_name: string | null;
  company_verified: boolean;
  max_concurrent_jobs: number;
  /** Rounded to nearest 100m. Present only when lat/lng/radius are sent and worker has GPS */
  distance_meters?: number | undefined;
}

export interface SearchPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
}

export interface PaginatedSearchResponse {
  success: boolean;
  data: WorkerSearchDocument[];
  meta: SearchPaginationMeta;
}

export interface SearchResult {
  workers: WorkerNearby[];
  documents: WorkerSearchDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  meta: SearchPaginationMeta;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
}

/**
 * Autocomplete Suggestion returned by `GET /api/v1/search/autocomplete`
 */
export interface AutocompleteSuggestion {
  type: 'category' | 'worker';
  label: string;
  label_ur?: string | undefined;
  category_id?: string | undefined;
  worker_id?: string | undefined;
}

export interface SearchSuggestion {
  type: 'worker' | 'service' | 'category';
  id: string;
  label: string;
  label_ur?: string | undefined;
  category_id?: string | undefined;
  worker_id?: string | undefined;
  subLabel?: string | undefined;
  iconUrl?: string | undefined;
}

/**
 * Trending Search Term returned by `GET /api/v1/search/trending`
 */
export interface TrendingTerm {
  term: string;
  search_count: number;
}
