/**
 * TaskLync Customer App — Custom Service Request & Dynamic Quote Types
 *
 * Strict implementation matching TaskLync Microservices Architecture:
 * - booking-service: CustomRequest & Quote domain entities and DTOs
 * - chat-service: Pre-booking clarification room entities
 * - notification-service: Custom request and quote push templates
 */

export const CustomRequestStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CLARIFICATION_REQUESTED: 'CLARIFICATION_REQUESTED',
  QUOTE_SENT: 'QUOTE_SENT',
  ACCEPTED: 'ACCEPTED',
  CONVERTED: 'CONVERTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type CustomRequestStatus = (typeof CustomRequestStatus)[keyof typeof CustomRequestStatus];

export const QuoteStatus = {
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  SUPERSEDED: 'SUPERSEDED',
  WITHDRAWN: 'WITHDRAWN',
  EXPIRED: 'EXPIRED',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const QuotePricingType = {
  FIXED_QUOTE: 'FIXED_QUOTE',
  ESTIMATE: 'ESTIMATE',
} as const;
export type QuotePricingType = (typeof QuotePricingType)[keyof typeof QuotePricingType];

export interface CustomServiceRequestMedia {
  id: string;
  request_id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  cloudinary_public_id?: string;
  file_size_bytes?: number | null;
  created_at: string;
}

export interface CustomServiceRequestMediaInput {
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  cloudinary_public_id: string;
  file_size_bytes?: number;
}

export interface CustomServiceRequest {
  id: string;
  user_id: string;
  worker_id: string;
  category_id: string;
  title: string;
  description: string;
  address_id?: string;
  address_text: string;
  latitude?: number;
  longitude?: number;
  job_site_location?: {
    lat: number;
    lng: number;
    x?: number;
    y?: number;
  };
  preferred_date?: string | null;
  preferred_time_slot?: string | null;
  status: CustomRequestStatus;
  active_quote_id?: string | null;
  booking_id?: string | null;
  decline_reason?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;

  // Joined / enriched fields
  media?: CustomServiceRequestMedia[];
  active_quote?: Quote | null;
  user_name?: string | null;
  user_phone?: string | null;
  worker_name?: string | null;
  worker_phone?: string | null;
  worker_avatar?: string | null;
  /** Who the request was sent to. For an agency `provider_name` is the BUSINESS name (worker_name is the owner). */
  provider_type?: 'INDIVIDUAL' | 'COMPANY';
  provider_name?: string | null;
  category_name?: string | null;
  media_count?: number;
}

export interface Quote {
  id: string;
  request_id: string;
  worker_id: string;
  user_id: string;
  version: number;
  status: QuoteStatus;
  quote_type: QuotePricingType;
  scope_description: string;
  estimated_duration_hours: number;
  work_price: number;
  inspection_fee: number;
  subtotal: number;
  customer_platform_fee: number;
  worker_commission: number;
  total_price: number;
  worker_amount: number;
  currency: string;
  valid_until: string;
  terms_and_exclusions?: string | null;
  terms_and_conditions?: string | null; // Compatibility alias
  rejection_reason?: string | null;
  withdrawal_reason?: string | null;
  booking_id?: string | null;
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  request_id: string;
  version: number;
  work_price: number;
  inspection_fee: number;
  total_price: number;
  worker_amount?: number;
  scope_description: string;
  terms_and_exclusions?: string | null;
  valid_until: string;
  superseded_reason?: string | null;
  superseded_at?: string | null;
  created_at: string;
}

export interface CreateCustomRequestDto {
  worker_id: string;
  /**
   * Set to 'COMPANY' only when the request starts from an agency profile. The server derives the real
   * provider type itself and rejects a mismatch (PROVIDER_TYPE_MISMATCH). Never send 'INDIVIDUAL' from
   * profile data: the profile mapper defaults to INDIVIDUAL when the endpoint omits the type.
   */
  provider_type?: 'COMPANY';
  category_id: string;
  title: string;
  description: string;
  address_id: string;
  address_text: string;
  latitude: number;
  longitude: number;
  preferred_date?: string;
  preferred_time_slot?: string;
  media?: CustomServiceRequestMediaInput[];
}

export interface CancelCustomRequestDto {
  reason?: string;
}

export interface RejectQuoteDto {
  reason?: string;
}

export interface CreateBookingFromQuoteDto {
  quote_id: string;
  scheduled_at: string; // ISO-8601 UTC
  duration_hours: number;
  address_id: string;
  address_text: string;
  latitude: number;
  longitude: number;
  payment_method: 'CASH_ON_DELIVERY';
}

export interface CustomRequestsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  total_pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface CustomRequestsListResponse {
  requests: CustomServiceRequest[];
  pagination: CustomRequestsPagination;
}

export interface CustomRequestDetailResponse {
  request: CustomServiceRequest;
  media: CustomServiceRequestMedia[];
  activeQuote: Quote | null;
}

export interface QuotesForRequestResponse {
  quotes: Quote[];
  revisions: QuoteRevision[];
}

export interface BookingFromQuoteResponse {
  booking: {
    id: string;
    user_id: string;
    worker_id: string;
    category_id: string;
    service_type: string;
    status: string;
    scheduled_at: string;
    duration_hours: number;
    address_id: string;
    address_text: string;
    job_site_location: { lat: number; lng: number };
    base_price: number;
    estimated_total: number;
    platform_fee: number;
    worker_amount: number;
    currency: string;
    price_type: string;
    custom_request_id?: string;
    quote_id?: string;
    quote_type?: string;
    description?: string;
    created_at: string;
  };
  payment: {
    payment_id: string;
    method: string;
    status: string;
    instructions: string;
  };
}
