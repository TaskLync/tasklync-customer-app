/**
 * Offers, Deals & Discounts: backend contracts
 * (TASKLYNC_CUSTOMER_OFFERS_DISCOUNTS_IMPLEMENTATION.md, sections 6 and 10).
 *
 * There is no "Deal" entity in the backend. Two discount systems exist, both owned by booking-service:
 *   - platform Coupon (typed code, funded by the platform)
 *   - worker Promotion ("offer"; automatic, or by code, funded by the worker)
 */

export type DiscountType = 'PERCENT' | 'FIXED';
export type DiscountFunding = 'PLATFORM' | 'WORKER';

export type CouponErrorCode =
  | 'COUPON_NOT_VALID'
  | 'COUPON_NOT_APPLICABLE'
  | 'COUPON_MIN_AMOUNT'
  | 'COUPON_NOT_FIRST_BOOKING'
  | 'COUPON_USER_LIMIT_REACHED'
  | 'COUPON_NO_LONGER_AVAILABLE'
  | 'COUPON_ATTEMPTS_LOCKED'
  | 'COUPON_NOT_STACKABLE'
  | 'PROMOTION_NO_LONGER_AVAILABLE';

/** Search result badge: `GET /search/workers` → `promotion` (6.3). `discount_pct` is an effective, approximate percent. */
export interface SearchWorkerPromotion {
  title: string;
  discount_pct: number;
  ends_at: string;
}

/** `GET /promotions/worker/:workerId` (6.2): automatic offers only, no conditions. */
export interface PublicWorkerOffer {
  id: string;
  title: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  ends_at: string;
  /**
   * Optional: the documented endpoint is code-less and omits conditions, so these are only present
   * if the backend starts sending them. The UI renders them only when real; nothing is invented.
   */
  code?: string | null | undefined;
  min_booking_amount?: number | null | undefined;
}

/** What the cart holds: which services and how many. The server prices every line. */
export interface CartLineRef {
  service_id: string;
  quantity: number;
}

/** `POST /coupons/validate` request (6.1). Must mirror the booking that will be created. */
export interface ValidateCodeRequest {
  worker_id: string;
  category_id: string;
  items: CartLineRef[];
  scheduled_at: string;
  duration_hours: number;
  latitude: number;
  longitude: number;
  is_urgent: boolean;
  coupon_code: string;
}

/** Worker earnings are never exposed by this view. */
export interface PricingView {
  currency: string;
  price_type: string;
  /** Sum of the service lines before surge multipliers (absent from older servers). */
  base_price?: number | undefined;
  /** Services total after surge multipliers, before any discount and before the platform fee. */
  subtotal_before_discount: number;
  /** Total the customer saves (a worker offer also shrinks the platform fee). */
  discount_amount: number;
  /** The discount line: subtotal_before_discount - discount_on_subtotal + platform_fee = estimated_total. */
  discount_on_subtotal: number;
  platform_fee: number;
  estimated_total: number;
}

/** A server-priced cart line. */
export interface QuoteLine {
  service_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  price_type: string;
}

/** The one discount the server applied (never two). `code` is null for an automatic worker offer. */
export interface AppliedDiscountView {
  source: 'WORKER_OFFER' | 'COUPON';
  funding: DiscountFunding;
  title: string;
  code: string | null;
  discount_type: DiscountType;
  discount_value: number;
  /** Rs. taken off the subtotal. */
  amount: number;
  ends_at: string | null;
}

/** A discount that qualified but was not used because the policy allows only one. */
export interface NotAppliedDiscountView {
  source: 'WORKER_OFFER' | 'COUPON';
  title: string;
  saving: number;
  reason: 'NOT_STACKABLE_LOWER_SAVING';
}

export interface DiscountDecisionView {
  policy: string;
  applied: AppliedDiscountView | null;
  not_applied: NotAppliedDiscountView | null;
}

/** A platform coupon the customer can use for the current booking (POST /coupons/available). */
export interface AvailableCoupon {
  code: string;
  title: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_booking_amount: number;
  first_booking_only: boolean;
  ends_at: string;
  /** Rs. the customer would save with this coupon alone. */
  saving: number;
  /** False when the current worker offer already saves more (one discount per booking). */
  would_apply: boolean;
}

/** Authoritative checkout pricing: the no-code price (automatic worker offer included) + usable coupons. */
export interface CheckoutOffers {
  pricing: PricingView;
  items: QuoteLine[];
  discount: DiscountDecisionView;
  coupons: AvailableCoupon[];
}

export interface ValidateCodeValid {
  valid: true;
  preview_only: true;
  coupon: { code: string; title: string; ends_at: string };
  pricing: PricingView;
  items: QuoteLine[];
  discount: DiscountDecisionView;
  /** Present ONLY for worker promotions; absent means a platform coupon (B8). */
  funding?: 'WORKER' | undefined;
}

export interface ValidateCodeInvalid {
  valid: false;
  preview_only: true;
  reason_code: CouponErrorCode | string;
  message: string;
  /** The price without the rejected code (a worker offer, if any, still applies): keeps the price card correct. */
  pricing: PricingView;
  items: QuoteLine[];
  discount: DiscountDecisionView | null;
}

export type ValidateCodeResult = ValidateCodeValid | ValidateCodeInvalid;

/** The booking parameters a discount depends on. A change to any of them voids a previewed code. */
export interface BookingQuoteParams {
  worker_id: string;
  category_id: string;
  items: CartLineRef[];
  scheduled_at: string;
  duration_hours: number;
  latitude: number;
  longitude: number;
  is_urgent: boolean;
}

export type PromoStatus = 'idle' | 'validating' | 'applied' | 'invalid' | 'locked' | 'error';

export interface AppliedPromo {
  /** The raw string the customer typed (the server normalizes it). */
  code: string;
  /** Code as the server displays it (`coupon.code`). */
  displayCode: string;
  title: string;
  endsAt: string;
  funding?: 'WORKER' | undefined;
  pricing: PricingView;
  /** The discount the server applied for this code (never two). */
  discount: AppliedDiscountView | null;
}

/** Discount fields on a booking row (6.5). Numbers are coerced defensively (B17). */
export interface BookingDiscountFields {
  subtotal_before_discount?: number | null | undefined;
  discount_amount?: number | undefined;
  coupon_code_masked?: string | null | undefined;
  discount_funding?: DiscountFunding | null | undefined;
  coupon_id?: string | null | undefined;
  promotion_id?: string | null | undefined;
  /** Exact code the customer applied (null for an automatic worker offer). */
  coupon_code?: string | null | undefined;
  discount_type?: DiscountType | null | undefined;
  discount_value?: number | null | undefined;
  discount_title?: string | null | undefined;
  /** Server-priced services snapshot taken when the booking was created. */
  items?: QuoteLine[] | null | undefined;
}
