import type { SearchWorkerPromotion } from './offers.types';

export type ProviderType = 'INDIVIDUAL' | 'COMPANY';

export type WorkerAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'PAUSED' | 'INACTIVE' | 'UNAVAILABLE';

export interface WorkerNearby {
  id: string;
  name: string;
  avatarUrl: string | null;
  avgRating: number;
  totalReviews: number;
  currency: string;
  distanceMeters: number;
  distanceLabel: string;
  categories: string[];
  availabilityStatus: WorkerAvailabilityStatus;
  availableUntil: string | null;
  isOnJob: boolean;
  responseTimeMins: number;
  startingPrice: number | null;
  lat?: number | null | undefined;
  lng?: number | null | undefined;

  // ── Search Service v1.2.0 Enriched Fields ──
  bio?: string | null | undefined;
  city?: string | null | undefined;
  categoryIds?: string[] | undefined;
  minPrice?: number | null | undefined;
  maxPrice?: number | null | undefined;
  totalBookings?: number | undefined;
  isVerified?: boolean | undefined;
  isAvailable?: boolean | undefined;
  isBusy?: boolean | undefined;
  /** availabilityStatus came from a real-time backend field (not inferred from account state). */
  hasLiveAvailability?: boolean | undefined;
  badges?: string[] | undefined;
  isFeatured?: boolean | undefined;
  companyVerified?: boolean | undefined;
  maxConcurrentJobs?: number | undefined;
  hasDistance?: boolean | undefined;
  /** Best live automatic offer for this worker (search-service). Approximate percent; see OfferBadge. */
  promotion?: SearchWorkerPromotion | null | undefined;

  // ── Company / Agency Fields ──
  providerType?: ProviderType | undefined;
  businessName?: string | null | undefined;
  isCompany?: boolean | undefined;
  coverImageUrl?: string | null | undefined;
  ntnNumber?: string | null | undefined;
  fleetSize?: number | undefined;
}

export interface WorkerSkill {
  id: string;
  categoryId: string;
  categoryName: string;
  isVerified: boolean;
  yearsExp: number;
}

export interface WorkerServiceOffering {
  id: string;
  /** services.id of the predefined service (null for custom offerings); this is what booking-service prices against. */
  serviceId?: string | null;
  serviceName: string;
  serviceNameUr: string | null;
  customPrice: number;
  priceType: 'fixed' | 'hourly' | 'quote';
  isCustom: boolean;
  notes: string | null;
  description?: string | null;
  imageUrl?: string | null;
  /** Estimated duration in minutes — only set when the backend provides one. */
  durationMins?: number | null;
}

export interface WorkerPublicProfile extends WorkerNearby {
  bio: string | null;
  yearsExperience: number;
  totalBookings: number;
  city: string | null;
  verificationStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'UNVERIFIED';
  isVerified: boolean;
  skills: WorkerSkill[];
  serviceOfferings: WorkerServiceOffering[];

  // ── Company / Agency Specifications ──
  provider_type: ProviderType;
  business_name: string | null;
  ntn_number?: string | null;
  max_concurrent_jobs: number;
  company_verified_at: string | null;
  is_company: boolean;
}



