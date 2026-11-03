/**
 * Review Service Customer Types
 * Conforms to REVIEW_SERVICE_CUSTOMER_API_SPECIFICATION.md
 */

// ---------------------------------------------------------------------------
// Tag Specifications
// ---------------------------------------------------------------------------
export type ReviewTag =
  | 'punctual'
  | 'professional'
  | 'good_value'
  | 'clean'
  | 'skilled'
  | 'friendly';

export interface ReviewTagMeta {
  key: ReviewTag;
  label: string;
  iconName: string;
  description: string;
}

export const REVIEW_TAGS: Record<ReviewTag, ReviewTagMeta> = {
  punctual: {
    key: 'punctual',
    label: 'Punctual',
    iconName: 'Clock',
    description: 'Arrived on time',
  },
  professional: {
    key: 'professional',
    label: 'Professional',
    iconName: 'Award',
    description: 'Courteous & well-prepared',
  },
  good_value: {
    key: 'good_value',
    label: 'Good Value',
    iconName: 'Tag',
    description: 'Fair & transparent pricing',
  },
  clean: {
    key: 'clean',
    label: 'Clean & Tidy',
    iconName: 'Sparkles',
    description: 'Left work area spotless',
  },
  skilled: {
    key: 'skilled',
    label: 'Highly Skilled',
    iconName: 'Wrench',
    description: 'Expert problem solver',
  },
  friendly: {
    key: 'friendly',
    label: 'Friendly',
    iconName: 'Smile',
    description: 'Polite and easy to talk to',
  },
};

// ---------------------------------------------------------------------------
// Moderation & Reporting
// ---------------------------------------------------------------------------
export type ReportReason =
  | 'SPAM'
  | 'OFFENSIVE_LANGUAGE'
  | 'FAKE_REVIEW'
  | 'UNRELATED_CONTENT'
  | 'PERSONAL_INFO'
  | 'OTHER';

export interface ReportReasonMeta {
  key: ReportReason;
  label: string;
  description: string;
}

export const REPORT_REASONS: Record<ReportReason, ReportReasonMeta> = {
  SPAM: {
    key: 'SPAM',
    label: 'Spam or Advertising',
    description: 'Promotional content, repeated text, or links',
  },
  OFFENSIVE_LANGUAGE: {
    key: 'OFFENSIVE_LANGUAGE',
    label: 'Abusive or Offensive Language',
    description: 'Hate speech, profanity, harassment, or threats',
  },
  FAKE_REVIEW: {
    key: 'FAKE_REVIEW',
    label: 'Fake or Misleading Review',
    description: 'Review does not reflect actual service rendered',
  },
  UNRELATED_CONTENT: {
    key: 'UNRELATED_CONTENT',
    label: 'Unrelated Content',
    description: 'Content not pertinent to the service performed',
  },
  PERSONAL_INFO: {
    key: 'PERSONAL_INFO',
    label: 'Private Information',
    description: 'Contains phone numbers, addresses, or private details',
  },
  OTHER: {
    key: 'OTHER',
    label: 'Other Problem',
    description: 'Other violation of community guidelines',
  },
};

export type ReviewModerationStatus =
  | 'VISIBLE'
  | 'AUTO_HIDDEN'
  | 'ADMIN_HIDDEN'
  | 'ADMIN_RESTORED';

// ---------------------------------------------------------------------------
// Core Data Entities
// ---------------------------------------------------------------------------
export interface ReviewItem {
  id: string;
  booking_id: string;
  user_id: string;
  worker_id: string;
  rating: number; // 1-5 integer
  comment?: string | null | undefined;
  tags: ReviewTag[];
  photo_urls: string[];
  worker_reply?: string | null | undefined;
  worker_replied_at?: string | null | undefined;
  moderation_status: ReviewModerationStatus;
  report_count?: number | undefined;
  edited_at?: string | null | undefined;
  created_at: string;
  updated_at: string;

  // Optional contextual fields for enriched UI rendering
  reviewer_name?: string | undefined;
  reviewer_avatar?: string | null | undefined;
  service_name?: string | undefined;
}

export type ReviewEligibilityStatus = 'ELIGIBLE' | 'REVIEWED' | 'EXPIRED';

export interface ReviewEligibility {
  booking_id: string;
  status: ReviewEligibilityStatus;
  review_deadline: string;
  already_reviewed: boolean;
}

export interface WorkerRatingSummary {
  worker_id: string;
  average: number;
  total: number;
  distribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
  top_tags: Array<{ tag: ReviewTag; count: number }>;
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------
export interface CreateReviewPayload {
  booking_id: string;
  rating: number; // 1-5
  comment?: string | undefined;
  tags?: ReviewTag[] | undefined;
  photo_urls?: string[] | undefined;
}

export interface EditReviewPayload {
  rating?: number | undefined;
  comment?: string | undefined;
  tags?: ReviewTag[] | undefined;
}

export interface ReportReviewPayload {
  reason: ReportReason;
  note?: string | undefined;
}

// ---------------------------------------------------------------------------
// Error Codes & API Contract
// ---------------------------------------------------------------------------
export type ReviewErrorCode =
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_PHOTOS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'REVIEW_ACCESS_DENIED'
  | 'BOOKING_NOT_REVIEWABLE'
  | 'REVIEW_NOT_FOUND'
  | 'REVIEW_ALREADY_EXISTS'
  | 'REPORT_ALREADY_EXISTS'
  | 'MEDIA_TOO_LARGE'
  | 'REVIEW_WINDOW_EXPIRED'
  | 'EDIT_WINDOW_EXPIRED';

export interface ReviewApiError {
  code: ReviewErrorCode | string;
  message: string;
  details?: Record<string, any> | undefined;
}

// ---------------------------------------------------------------------------
// UI Form State Model
// ---------------------------------------------------------------------------
export interface ReviewFormState {
  overallRating: number;
  tags: ReviewTag[];
  comment: string;
  photoUrls: string[];
  canSubmit: boolean;
  charCount: number;
  charLimit: number;
}

// ---------------------------------------------------------------------------
// Backward Compatibility Aliases (for existing components & mappers)
// ---------------------------------------------------------------------------
export type ReviewCategoryKey = 'punctuality' | 'quality' | 'communication' | 'value';

export interface ReviewCategoryRatings {
  punctuality?: number | undefined;
  quality?: number | undefined;
  communication?: number | undefined;
  value?: number | undefined;
}

export interface ReviewSubmitPayload {
  bookingId: string;
  targetId?: string | undefined;
  targetType?: 'worker' | 'service' | undefined;
  rating: number;
  tags?: ReviewTag[] | undefined;
  photoUrls?: string[] | undefined;
  photo_urls?: string[] | undefined;
  categories?: {
    punctuality?: number | undefined;
    quality?: number | undefined;
    communication?: number | undefined;
    value?: number | undefined;
  } | undefined;
  comment?: string | undefined;
}

export interface PendingReviewItem {
  bookingId: string;
  workerId: string;
  workerName: string;
  workerAvatar: string | null;
  serviceName: string;
  completedAt: string;
  totalAmount?: number | undefined;
}

export interface WorkerReview {
  id: string;
  bookingId: string;
  workerId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string | null;
  rating: number;
  punctuality?: number | null | undefined;
  quality?: number | null | undefined;
  communication?: number | null | undefined;
  value?: number | null | undefined;
  comment: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  isVerified: boolean;
  serviceName?: string | undefined;
  service_name?: string | undefined;
  tags?: ReviewTag[] | undefined;
  photoUrls?: string[] | undefined;
  photo_urls?: string[] | undefined;
  editedAt?: string | null | undefined;
  edited_at?: string | null | undefined;
}

export interface ReviewSummaryData {
  avgRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  avgPunctuality?: number | null | undefined;
  avgQuality?: number | null | undefined;
  avgCommunication?: number | null | undefined;
  avgValue?: number | null | undefined;
  topTags?: Array<{ tag: ReviewTag; count: number }> | undefined;
}

export type ReviewSortOption = 'recent' | 'highest' | 'lowest' | 'verified';

export interface WorkerPortfolioImage {
  id: string;
  workerId: string;
  imageUrl: string;
  thumbnail: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  order: number;
  createdAt: string;
}
