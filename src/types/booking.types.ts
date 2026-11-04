/**
 * Booking Service Customer API Types & Specification Interfaces
 * Aligned with BOOKING_SERVICE_CUSTOMER_API_SPECIFICATION.md (v2.0.0)
 * Extended with Day 34 Invoice, Dispute, and Refund Policy models
 */

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED_BY_WORKER'
  | 'COMPLETED'
  | 'AUTO_COMPLETED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'REFUNDED'
  | 'CANCELLED';

export type ServiceType = 'ONE_TIME' | 'RECURRING';

export type PriceType = 'hourly' | 'fixed' | 'quote';

export type DisputeStatus =
  | 'OPEN'
  | 'SUBMITTED'
  | 'PENDING'
  | 'WORKER_RESPONDED'
  | 'UNDER_REVIEW'
  | 'UNDER_INVESTIGATION'
  | 'RESOLVED'
  | 'REFUNDED'
  | 'REJECTED'
  | 'CLOSED';

/**
 * Day 34: Fixed 5-Reason Union for Guided Conflict Resolution (Hick's Law)
 */
export type DisputeReason =
  | 'work_not_completed'
  | 'poor_quality'
  | 'worker_no_show'
  | 'overcharged'
  | 'other';

export interface DisputeReasonOption {
  key: DisputeReason;
  label: string;
  description: string;
}

/**
 * Day 34: Computed Cancellation & Refund Policy Shape
 */
export interface RefundPolicyResult {
  percentage: number; // 0, 50, 90, 100
  label: string; // e.g. "Full Refund (100%)", "90% Refund", "50% Refund", "No Refund"
  headline: string; // e.g. "You'll receive a 90% refund"
  reason: string; // Plain-language explanation
  eligibleForRefund: boolean;
  isDisputeOnly: boolean;
  estimatedRefundAmount?: number;
}

/**
 * Day 34: 3-Slot Evidence Upload State Machine
 */
export type EvidenceSlotStatus = 'idle' | 'picking' | 'uploading' | 'success' | 'error';

export interface EvidenceSlotState {
  id: string;
  localUri?: string | null;
  uploadedUrl?: string | null;
  status: EvidenceSlotStatus;
  progress: number;
  error?: string | null;
}

/**
 * Day 34: Invoice & Receipt Data Shapes (Discriminated Union)
 */
export interface InvoiceLineItemData {
  id: string;
  name: string;
  description?: string | undefined;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InvoicePaymentMethodData {
  type: 'card' | 'wallet' | 'cash';
  brand?: string | undefined;
  last4?: string | undefined;
  paid_at?: string | undefined;
  status: 'PAID' | 'PENDING' | 'REFUNDED';
}

export interface StructuredInvoiceData {
  kind: 'structured';
  invoice_number: string;
  issued_at: string;
  due_date?: string | undefined;
  booking_id: string;
  customer: {
    name: string;
    phone?: string | undefined;
    address?: string | undefined;
  };
  provider: {
    name: string;
    avatar_url?: string | null | undefined;
    category?: string | undefined;
    phone?: string | undefined;
    tax_id?: string | undefined;
  };
  line_items: InvoiceLineItemData[];
  subtotal: number;
  platform_fee: number;
  urgency_fee?: number | undefined;
  discount?: number | undefined;
  total: number;
  currency: string;
  payment_method: InvoicePaymentMethodData;
  notes?: string | undefined;
}

export interface PdfInvoiceData {
  kind: 'pdf';
  invoice_number: string;
  url: string;
  issued_at: string;
  total?: number | undefined;
  currency?: string | undefined;
}

export type InvoiceData = StructuredInvoiceData | PdfInvoiceData;

/**
 * 6.1 Price Estimate Query Parameters (GET /api/v1/bookings/estimate)
 */
export interface PriceEstimateParams {
  worker_id: string;
  category_id: string;
  service_id?: string | undefined;
  scheduled_at: string; // ISO-8601 UTC
  duration_hours: number; // 0.5 to 12.0
  latitude: number;
  longitude: number;
  is_urgent: boolean;
  custom_base_price?: number | undefined;
}

/**
 * 6.1 Price Estimate Response Data
 */
export interface PriceEstimateData {
  base_price: number;
  urgency_multiplier: number;
  demand_multiplier: number;
  time_of_day_multiplier: number;
  estimated_total: number;
  platform_fee: number;
  worker_commission?: number | undefined;
  worker_amount: number;
  platform_revenue?: number | undefined;
  currency: string;
  price_type: PriceType;
}

/**
 * 6.2 Create Booking Request Payload (POST /api/v1/bookings)
 */
export interface CreateBookingPayload {
  worker_id: string;
  category_id: string;
  service_id?: string | undefined;
  service_type: ServiceType;
  scheduled_at: string; // ISO-8601 UTC
  duration_hours: number;
  address_id: string;
  address_text: string;
  latitude: number;
  longitude: number;
  is_urgent: boolean;
  description?: string | undefined;
  custom_base_price?: number | undefined;
}

/**
 * 6.2 & 6.4 Booking Details Model
 */
export interface BookingDetails {
  id: string;
  user_id: string;
  worker_id: string;
  category_id: string;
  service_id?: string | undefined;
  service_type: ServiceType;
  status: BookingStatus;
  scheduled_at: string;
  duration_hours: number;
  expires_at?: string | undefined;
  address_id: string;
  address_text: string;
  job_site_location: {
    lat: number;
    lng: number;
  };
  base_price: number;
  urgency_multiplier: number;
  demand_multiplier: number;
  time_of_day_multiplier: number;
  estimated_total: number;
  platform_fee: number;
  worker_amount: number;
  currency: string;
  price_type: PriceType;
  is_urgent: boolean;
  is_payment_confirmed: boolean;
  cancellation_reason?: string | undefined;
  cancelled_by?: string | undefined;
  completed_at?: string | undefined;
  started_at?: string | undefined;
  description?: string | undefined;
  created_at: string;
  worker_name?: string | undefined;
  worker_avatar_url?: string | undefined;
  worker_phone?: string | undefined;
  category_name?: string | undefined;
  custom_request_id?: string | undefined;
  quote_id?: string | undefined;
  quote_type?: string | undefined;
  dispute?: DisputeDetails | null | undefined;

  // ── Company / Agency & Dispatched Technician Specifications ──
  provider_type?: 'INDIVIDUAL' | 'COMPANY' | undefined;
  provider_name?: string | null | undefined;
  provider_avatar_url?: string | null | undefined;
  is_company?: boolean | undefined;
  assigned_worker_name?: string | null | undefined;
  assigned_worker_phone?: string | null | undefined;
  assignee?: BookingDispatchedTechnician | null | undefined;
}

export interface BookingDispatchedTechnician {
  name: string;
  phone: string | null;
  dispatched_at?: string | undefined;
}

/**
 * 6.3 List Customer Bookings Query Parameters (GET /api/v1/bookings)
 */
export interface ListBookingsParams {
  page?: number | undefined;
  limit?: number | undefined;
  status?: BookingStatus | string | undefined;
  from_date?: string | undefined;
  to_date?: string | undefined;
}

/**
 * Booking Pagination Metadata
 */
export interface BookingPaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages?: number | undefined;
  totalPages?: number | undefined;
  has_next?: boolean | undefined;
  has_prev?: boolean | undefined;
  hasMore?: boolean | undefined;
}

/**
 * 6.3 List Response Envelope
 */
export interface ListBookingsResponse {
  status: 'success' | 'error';
  data: BookingDetails[];
  meta: BookingPaginationMeta;
  message?: string | undefined;
}

/**
 * 6.5 Real-time Booking Tracking Data (GET /api/v1/bookings/:id/track)
 */
export interface BookingTrackData {
  booking_id: string;
  status: BookingStatus;
  scheduled_at: string;
  started_at: string | null;
  worker_id: string;
  worker_name?: string | undefined;
  worker_phone?: string | undefined;
  worker_latitude?: number | undefined;
  worker_longitude?: number | undefined;
  /** ISO timestamp of the worker position (spec 9.7 `last_updated_at`); absent when unknown. */
  last_updated_at?: string | undefined;
}

/**
 * 6.6 Cancel Booking Payload & Response (PATCH /api/v1/bookings/:id/cancel)
 */
export interface CancelBookingPayload {
  reason: string;
}

export interface CancelBookingData {
  id: string;
  status: 'CANCELLED';
  cancellation_reason: string;
  cancelled_by: 'user' | 'worker';
  updated_at: string;
  refund_amount?: number | undefined;
  refund_percentage?: number | undefined;
}

/**
 * 6.7 Confirm Booking Completion Response (PATCH /api/v1/bookings/:id/confirm)
 */
export interface ConfirmCompletionData {
  id: string;
  status: 'COMPLETED';
  completed_at: string;
}

/**
 * 6.8 Open Dispute Payload & Response (POST /api/v1/bookings/:id/dispute)
 */
export interface OpenDisputePayload {
  reason: string;
  description?: string | undefined;
  evidence_urls?: string[] | undefined;
}

export interface DisputeDetails {
  id: string;
  booking_id: string;
  raised_by: string;
  raised_against: string;
  status: DisputeStatus;
  reason: string;
  description?: string | undefined;
  evidence_urls?: string[] | undefined;
  worker_response?: string | undefined;
  created_at: string;
  resolved_at?: string | undefined;
  resolution_notes?: string | undefined;
}

/**
 * Standard Gateway API Envelope Structure
 */
export interface ApiEnvelope<T> {
  status: 'success' | 'error';
  data: T;
  message?: string | undefined;
  code?: string | undefined;
  meta?: BookingPaginationMeta | undefined;
}

/**
 * Job Start Verification Credentials (Customer-Side)
 * Strictly matches backend booking-service verification contracts
 */
export interface VerificationOtpData {
  booking_id: string;
  otp: string;
  expires_at: string;
  expires_in: number;
}

export interface VerificationQrData {
  booking_id: string;
  qr_token: string;
  expires_at: string;
  expires_in: number;
}

