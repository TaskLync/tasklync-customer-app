/**
 * Pure helpers for Offers, Deals & Discounts (no React / React Native imports, unit-testable).
 *
 * Rule from the spec: the app NEVER computes prices. Everything here formats, classifies or
 * selects values the server already returned.
 */
import type {
  AppliedDiscountView,
  BookingDiscountFields,
  BookingQuoteParams,
  DiscountFunding,
  DiscountType,
  PublicWorkerOffer,
  QuoteLine,
  SearchWorkerPromotion,
} from '../types/offers.types';

// ─── Numbers & money ────────────────────────────────────────────────────────

/** Booking rows may deliver NUMERIC columns as numbers or strings (B17). */
export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

const formatNumber = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** "Rs. 1,250" in the same style as the rest of the app. */
export function formatRs(amount: number): string {
  return `Rs. ${formatNumber(amount)}`;
}

// ─── Offer labels ───────────────────────────────────────────────────────────

/**
 * PERCENT: "15% off" (+ " (up to Rs. 500)"), FIXED: "Rs. 200 off".
 * Built from the discount fields only: the public endpoint omits every condition.
 */
export function formatOfferValue(
  offer: Pick<PublicWorkerOffer, 'discount_type' | 'discount_value' | 'max_discount_amount'>
): string {
  const value = toNumber(offer.discount_value);
  if (offer.discount_type === 'PERCENT') {
    const cap = offer.max_discount_amount;
    return cap != null && toNumber(cap) > 0
      ? `${formatNumber(value)}% off (up to ${formatRs(toNumber(cap))})`
      : `${formatNumber(value)}% off`;
  }
  return `${formatRs(value)} off`;
}

/** "Min. order Rs. 1,500", or null when the backend gave no (positive) minimum. */
export function formatMinOrder(offer: Pick<PublicWorkerOffer, 'min_booking_amount'>): string | null {
  const min = toNumber(offer.min_booking_amount);
  return min > 0 ? `Min. order ${formatRs(min)}` : null;
}

/** Headline only ("15% off", "Rs. 200 off"); the percent cap is a detail, see formatOfferCap. */
export function formatOfferHeadline(
  offer: Pick<PublicWorkerOffer, 'discount_type' | 'discount_value'>
): string {
  const value = toNumber(offer.discount_value);
  return offer.discount_type === 'PERCENT' ? `${formatNumber(value)}% off` : `${formatRs(value)} off`;
}

/** "Up to Rs. 500" for a capped percent offer, otherwise null. */
export function formatOfferCap(
  offer: Pick<PublicWorkerOffer, 'discount_type' | 'max_discount_amount'>
): string | null {
  const cap = toNumber(offer.max_discount_amount);
  return offer.discount_type === 'PERCENT' && cap > 0 ? `Up to ${formatRs(cap)}` : null;
}

/** Search badge text: the percent is approximate (effective percent against the reference price). */
export function formatBadgePercent(promotion: Pick<SearchWorkerPromotion, 'discount_pct'>): string | null {
  const pct = Math.round(toNumber(promotion.discount_pct));
  return pct > 0 ? `${Math.min(pct, 100)}% off` : null;
}

/** `promotion` on a search result: tolerant of absent/odd values, null when there is no usable offer. */
export function parseSearchPromotion(raw: any): SearchWorkerPromotion | null {
  if (!raw || typeof raw !== 'object') return null;
  const pct = toNumber(raw.discount_pct ?? raw.discountPct);
  const endsAt = raw.ends_at ?? raw.endsAt;
  if (pct <= 0 || typeof endsAt !== 'string' || !endsAt) return null;
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    discount_pct: pct,
    ends_at: endsAt,
  };
}

// ─── Expiry ─────────────────────────────────────────────────────────────────

const parseTime = (iso: string): number => new Date(iso).getTime();

/** False once `ends_at` is in the past (cached search results can be stale). Unparseable dates are not hidden. */
export function isOfferLive(endsAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!endsAt) return true;
  const t = parseTime(endsAt);
  return Number.isNaN(t) ? true : t > now;
}

/** "Ends in 2d" / "Ends in 5h" / "Ends in 20m". Null when expired or unparseable. */
export function formatEndsIn(endsAt: string | null | undefined, now: number = Date.now()): string | null {
  if (!endsAt) return null;
  const t = parseTime(endsAt);
  if (Number.isNaN(t)) return null;
  const ms = t - now;
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'Ends in <1m';
  if (minutes < 60) return `Ends in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ends in ${hours}h`;
  return `Ends in ${Math.floor(hours / 24)}d`;
}

/** Calendar date for the expiry of an applied code, e.g. "Valid until 14 Nov". */
export function formatValidUntil(endsAt: string | null | undefined): string | null {
  if (!endsAt) return null;
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return null;
  return `Valid until ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

// ─── Error codes (6.6) ──────────────────────────────────────────────────────

/** Server texts from the spec. The app's HTTP layer rewrites some messages (409/429), so key on the code. */
const SERVER_MESSAGES: Record<string, string> = {
  COUPON_NOT_VALID: 'This coupon is not valid.',
  COUPON_NOT_APPLICABLE: 'This coupon cannot be used for this service.',
  COUPON_MIN_AMOUNT: 'This coupon needs a larger booking amount.',
  COUPON_NOT_FIRST_BOOKING: 'This coupon is only for your first booking.',
  COUPON_USER_LIMIT_REACHED: 'You have already used this coupon.',
  COUPON_NO_LONGER_AVAILABLE: 'This coupon just ran out. Continue without it or try another.',
  COUPON_ATTEMPTS_LOCKED: 'Too many wrong codes. Try again in a few minutes.',
  COUPON_NOT_STACKABLE: 'Only one discount can be used per booking.',
  PROMOTION_NO_LONGER_AVAILABLE: 'This offer just ran out. Continue without it.',
};

export const DISCOUNT_ERROR_CODES = Object.keys(SERVER_MESSAGES);

export function isDiscountErrorCode(code: unknown): code is string {
  return typeof code === 'string' && code in SERVER_MESSAGES;
}

/**
 * Copy for a discount failure. The server message is used verbatim when it is specific
 * (COUPON_MIN_AMOUNT carries the minimum); otherwise the documented text for the code.
 * Reasons are never invented: COUPON_NOT_VALID is deliberately opaque.
 */
export function discountErrorMessage(code: unknown, serverMessage?: string | null): string {
  const documented = isDiscountErrorCode(code) ? SERVER_MESSAGES[code] : undefined;
  const fromServer = typeof serverMessage === 'string' ? serverMessage.trim() : '';
  // The HTTP layer replaces 409/429 bodies with generic copy; those must not reach the customer.
  const generic = /^(something went wrong|too many requests)/i.test(fromServer);
  if (fromServer && !generic) return fromServer;
  return documented ?? 'This code could not be applied.';
}

/**
 * What the checkout does when POST /bookings fails for a discount reason (10.3):
 *  - 'continue_without': offer to resubmit without a code
 *  - 'clear': drop the applied code and return to the original price
 *  - null: not a discount failure
 */
export type CreateDiscountFailure = 'continue_without' | 'clear' | null;

export function classifyCreateDiscountFailure(code: unknown): CreateDiscountFailure {
  switch (code) {
    case 'COUPON_NO_LONGER_AVAILABLE':
    case 'PROMOTION_NO_LONGER_AVAILABLE':
    case 'COUPON_ATTEMPTS_LOCKED':
      return 'continue_without';
    case 'COUPON_NOT_VALID':
    case 'COUPON_NOT_APPLICABLE':
    case 'COUPON_MIN_AMOUNT':
    case 'COUPON_NOT_FIRST_BOOKING':
    case 'COUPON_USER_LIMIT_REACHED':
      return 'clear';
    default:
      return null;
  }
}

/** The server does not return a retry-after for the wrong-code lockout; default window is 900 s (B13). */
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export function lockoutRemainingMs(lockedAt: number | null | undefined, now: number = Date.now()): number {
  if (!lockedAt) return 0;
  return Math.max(0, lockedAt + LOCKOUT_WINDOW_MS - now);
}

/** "about 12 min" style countdown. */
export function formatLockoutRemaining(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `${minutes} min`;
}

// ─── Code input ─────────────────────────────────────────────────────────────

/** Request schema: trimmed, 3..32 chars. */
export const CODE_MIN_LENGTH = 3;
export const CODE_MAX_LENGTH = 32;

export function trimCode(raw: string): string {
  return raw.trim();
}

export function isCodeInputValid(raw: string): boolean {
  const len = trimCode(raw).length;
  return len >= CODE_MIN_LENGTH && len <= CODE_MAX_LENGTH;
}

// ─── Booking parameters ─────────────────────────────────────────────────────

/**
 * Identity of the booking a previewed code was priced for. Prices depend on every one of these
 * (urgency, duration, time of day, location), so a change voids the preview (8.3 step 7).
 */
export function quoteParamsHash(p: BookingQuoteParams): string {
  return [
    p.worker_id,
    p.category_id,
    (p.items ?? []).map((i) => `${i.service_id}x${i.quantity}`).join(','),
    p.scheduled_at,
    p.duration_hours,
    p.latitude,
    p.longitude,
    p.is_urgent ? 1 : 0,
  ].join('|');
}

// ─── Envelope (2.3, B14) ────────────────────────────────────────────────────

/** Reads `{ success, data }` and the documented `{ status: 'success', data }` variant. */
export function unwrapEnvelope<T>(body: any): T {
  if (body && typeof body === 'object' && 'data' in body && (body.success === true || body.status === 'success' || body.success === undefined)) {
    return body.data as T;
  }
  return body as T;
}

// ─── Price breakdown (8.5) ──────────────────────────────────────────────────

export interface BreakdownInput {
  /** `subtotal_before_discount` (pre-fee, pre-discount). */
  subtotalBeforeDiscount?: number | null | undefined;
  platformFee: number;
  discountAmount: number;
  /** Absent/null funding is treated as unknown. A checkout coupon (no `funding` field) passes 'PLATFORM'. */
  funding?: DiscountFunding | null | undefined;
}

export type BreakdownRowKind = 'line' | 'discount' | 'saving';

export interface BreakdownRow {
  key: 'subtotal' | 'platformFee' | 'discount' | 'saved';
  label: string;
  amount: number;
  kind: BreakdownRowKind;
}

/**
 * Platform coupon: subtotal + fee - discount = total, so every line is shown.
 * Worker promotion: the fee is the REDUCED fee and subtotal_before_discount the PRE-discount subtotal,
 * so the lines do not reconcile; show only the fee and what the customer saved.
 * Unknown funding takes the safe form.
 */
export function buildBreakdownRows(input: BreakdownInput): BreakdownRow[] {
  const discount = toNumber(input.discountAmount);
  const fee = toNumber(input.platformFee);
  if (discount <= 0) return [];

  if (input.funding === 'PLATFORM' && input.subtotalBeforeDiscount != null) {
    return [
      { key: 'subtotal', label: 'Subtotal', amount: toNumber(input.subtotalBeforeDiscount), kind: 'line' },
      { key: 'platformFee', label: 'Platform fee', amount: fee, kind: 'line' },
      { key: 'discount', label: 'Discount', amount: -discount, kind: 'discount' },
    ];
  }
  return [
    { key: 'platformFee', label: 'Platform fee', amount: fee, kind: 'line' },
    { key: 'saved', label: 'You saved', amount: discount, kind: 'saving' },
  ];
}

export interface BookingSavings {
  hasDiscount: boolean;
  amount: number;
  funding: DiscountFunding | null;
  /** "Promo code" | "Worker offer" | "Discount" */
  sourceLabel: string;
  /** Exact code when the booking stored one, else the masked code; "Offer applied" for automatic promotions. */
  chipLabel: string;
  /** The exact code the customer applied, or null (automatic offer / legacy booking that only has a masked code). */
  code: string | null;
  /** "10% OFF" / "Rs. 200 OFF", or null when the booking predates the stored snapshot. */
  valueLabel: string | null;
  title: string | null;
  /** Name of the discount line: "Coupon SAVE10", "Worker offer". */
  rowLabel: string;
}

/** Reads the discount snapshot on a booking row. */
export function getBookingSavings(booking: BookingDiscountFields | null | undefined): BookingSavings {
  const amount = Math.max(0, toNumber(booking?.discount_amount));
  const funding: DiscountFunding | null =
    booking?.discount_funding === 'PLATFORM' || booking?.discount_funding === 'WORKER'
      ? booking.discount_funding
      : null;
  const masked = typeof booking?.coupon_code_masked === 'string' ? booking.coupon_code_masked.trim() : '';
  const exact = typeof booking?.coupon_code === 'string' ? booking.coupon_code.trim() : '';
  const type = booking?.discount_type === 'PERCENT' || booking?.discount_type === 'FIXED' ? booking.discount_type : null;
  const value = toNumber(booking?.discount_value);
  const title = typeof booking?.discount_title === 'string' && booking.discount_title.trim() ? booking.discount_title.trim() : null;
  return {
    hasDiscount: amount > 0,
    amount,
    funding,
    sourceLabel: funding === 'PLATFORM' ? 'Promo code' : funding === 'WORKER' ? 'Worker offer' : 'Discount',
    chipLabel: exact || masked || 'Offer applied',
    code: exact || null,
    valueLabel: type && value > 0 ? discountValueLabel(type, value) : null,
    title,
    rowLabel: exact
      ? `Coupon ${exact}`
      : funding === 'WORKER'
        ? 'Worker offer'
        : masked
          ? `Coupon ${masked}`
          : 'Discount',
  };
}

// ─── Cancel warning (8.6) ───────────────────────────────────────────────────

/**
 * What happens to the used code/offer on a customer cancellation (5.8):
 * kept once the booking is ACCEPTED, returned while PENDING. Other states give no promise.
 */
export function cancelDiscountNotice(
  status: string | undefined,
  hasDiscount: boolean
): { tone: 'warning' | 'info'; text: string } | null {
  if (!hasDiscount) return null;
  if (status === 'PENDING') return { tone: 'info', text: 'Your promo code or offer will be returned.' };
  if (status === 'ACCEPTED') {
    return { tone: 'warning', text: 'Cancelling now means your promo code or offer will not be returned.' };
  }
  return null;
}

// ─── Booking row normalization ──────────────────────────────────────────────

/**
 * Discount snapshot of a booking row (013/015 migrations). NUMERIC columns can arrive as strings,
 * and a booking without a discount has null/0 here.
 */
export function normalizeDiscountFields(raw: any): BookingDiscountFields {
  const subtotal = raw?.subtotal_before_discount ?? raw?.subtotalBeforeDiscount;
  const funding = raw?.discount_funding ?? raw?.discountFunding;
  const masked = raw?.coupon_code_masked ?? raw?.couponCodeMasked;
  const code = raw?.coupon_code ?? raw?.couponCode;
  const type = raw?.discount_type ?? raw?.discountType;
  const value = raw?.discount_value ?? raw?.discountValue;
  const title = raw?.discount_title ?? raw?.discountTitle;
  return {
    subtotal_before_discount: subtotal == null ? null : toNumber(subtotal),
    discount_amount: Math.max(0, toNumber(raw?.discount_amount ?? raw?.discountAmount)),
    coupon_code_masked: typeof masked === 'string' && masked.trim() ? masked.trim() : null,
    discount_funding: funding === 'PLATFORM' || funding === 'WORKER' ? funding : null,
    coupon_id: raw?.coupon_id ?? raw?.couponId ?? null,
    promotion_id: raw?.promotion_id ?? raw?.promotionId ?? null,
    coupon_code: typeof code === 'string' && code.trim() ? code.trim() : null,
    discount_type: type === 'PERCENT' || type === 'FIXED' ? type : null,
    discount_value: value == null ? null : toNumber(value),
    discount_title: typeof title === 'string' && title.trim() ? title.trim() : null,
    items: normalizeLines(raw?.items),
  };
}

/** Server-priced cart lines (booking snapshot or quote). Unusable rows are dropped. */
export function normalizeLines(raw: unknown): QuoteLine[] | null {
  let list: unknown = raw;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { return null; }
  }
  if (!Array.isArray(list)) return null;
  const lines = list
    .filter((l: any) => l && typeof l === 'object')
    .map((l: any): QuoteLine => ({
      service_id: String(l.service_id ?? ''),
      name: typeof l.name === 'string' ? l.name : '',
      quantity: Math.max(1, Math.round(toNumber(l.quantity)) || 1),
      unit_price: toNumber(l.unit_price),
      line_total: toNumber(l.line_total),
      price_type: typeof l.price_type === 'string' ? l.price_type : 'fixed',
    }));
  return lines.length > 0 ? lines : null;
}

// ─── Applied discount presentation (checkout + booking details share these) ─────────────

/** "10% OFF" / "Rs. 200 OFF". */
export function discountValueLabel(type: DiscountType, value: number): string {
  return type === 'PERCENT' ? `${formatNumber(value)}% OFF` : `${formatRs(value)} OFF`;
}

/** "Coupon SAVE10" for a code, "Worker offer" for an automatic offer. */
export function appliedDiscountName(a: Pick<AppliedDiscountView, 'source' | 'code'>): string {
  if (a.code) return `Coupon ${a.code}`;
  return a.source === 'WORKER_OFFER' ? 'Worker offer' : 'Coupon';
}

export interface PriceSummaryRow {
  key: string;
  label: string;
  /** Small grey line under the label. */
  hint?: string | undefined;
  amount: number;
  kind: 'line' | 'discount';
}

export interface PriceSummaryInput {
  /** Services total after surge, before discount and fee. */
  originalAmount: number;
  /** Pre-surge sum of the lines; when lower than originalAmount the difference is shown as a surge row. */
  baseAmount?: number | null | undefined;
  discount?: { name: string; valueLabel: string | null; amount: number } | null | undefined;
  platformFee: number;
}

/**
 * Rows of the checkout / booking-details bill. Every number is a server value; the only arithmetic is
 * the surge row (a difference of two server numbers) and it is shown only when positive.
 *   Original price / Surge / <Coupon SAVE10 · 10% OFF> / Platform fee   (total is rendered by the caller)
 */
export function buildPriceSummaryRows(input: PriceSummaryInput): PriceSummaryRow[] {
  const original = toNumber(input.originalAmount);
  const base = input.baseAmount == null ? null : toNumber(input.baseAmount);
  const rows: PriceSummaryRow[] = [];
  if (base != null && base > 0 && original > base + 0.005) {
    rows.push({ key: 'base', label: 'Original price', amount: base, kind: 'line' });
    rows.push({ key: 'surge', label: 'Surge / demand', amount: Math.round((original - base) * 100) / 100, kind: 'line' });
  } else {
    rows.push({ key: 'original', label: 'Original price', amount: original, kind: 'line' });
  }
  const d = input.discount;
  if (d && toNumber(d.amount) > 0) {
    rows.push({
      key: 'discount',
      label: d.name,
      hint: d.valueLabel ?? undefined,
      amount: -toNumber(d.amount),
      kind: 'discount',
    });
  }
  rows.push({ key: 'platformFee', label: 'Platform fee', amount: toNumber(input.platformFee), kind: 'line' });
  return rows;
}

/** The discount line of a stored booking: item discount = subtotal_before - (total - fee), from stored values only. */
export function bookingItemDiscount(b: {
  subtotal_before_discount?: number | null | undefined;
  estimated_total: number;
  platform_fee: number;
}): number {
  if (b.subtotal_before_discount == null) return 0;
  const v = toNumber(b.subtotal_before_discount) - (toNumber(b.estimated_total) - toNumber(b.platform_fee));
  return v > 0.005 ? Math.round(v * 100) / 100 : 0;
}
