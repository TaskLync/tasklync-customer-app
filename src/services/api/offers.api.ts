import { apiClient } from './client';
import { isValidUUID } from '../../utils/uuid';
import { isCodeInputValid, normalizeLines, toNumber, trimCode, unwrapEnvelope } from '../../utils/offers';
import type {
  AvailableCoupon,
  BookingQuoteParams,
  CheckoutOffers,
  DiscountDecisionView,
  PricingView,
  PublicWorkerOffer,
  ValidateCodeRequest,
  ValidateCodeResult,
} from '../../types/offers.types';

const toPricingView = (raw: any): PricingView => ({
  currency: typeof raw?.currency === 'string' && raw.currency ? raw.currency : 'PKR',
  price_type: typeof raw?.price_type === 'string' ? raw.price_type : 'fixed',
  ...(raw?.base_price == null ? {} : { base_price: toNumber(raw.base_price) }),
  subtotal_before_discount: toNumber(raw?.subtotal_before_discount),
  discount_amount: toNumber(raw?.discount_amount),
  discount_on_subtotal: toNumber(raw?.discount_on_subtotal),
  platform_fee: toNumber(raw?.platform_fee),
  estimated_total: toNumber(raw?.estimated_total),
});

const toDecision = (raw: any): DiscountDecisionView => {
  const a = raw?.applied;
  const n = raw?.not_applied;
  const type = (t: unknown) => (t === 'FIXED' ? 'FIXED' : 'PERCENT');
  return {
    policy: typeof raw?.policy === 'string' ? raw.policy : '',
    applied:
      a && typeof a === 'object'
        ? {
            source: a.source === 'COUPON' ? 'COUPON' : 'WORKER_OFFER',
            funding: a.funding === 'PLATFORM' ? 'PLATFORM' : 'WORKER',
            title: typeof a.title === 'string' ? a.title : '',
            code: typeof a.code === 'string' && a.code ? a.code : null,
            discount_type: type(a.discount_type),
            discount_value: toNumber(a.discount_value),
            amount: toNumber(a.amount),
            ends_at: typeof a.ends_at === 'string' ? a.ends_at : null,
          }
        : null,
    not_applied:
      n && typeof n === 'object'
        ? {
            source: n.source === 'COUPON' ? 'COUPON' : 'WORKER_OFFER',
            title: typeof n.title === 'string' ? n.title : '',
            saving: toNumber(n.saving),
            reason: 'NOT_STACKABLE_LOWER_SAVING',
          }
        : null,
  };
};

const toAvailableCoupon = (raw: any): AvailableCoupon | null => {
  if (!raw || typeof raw.code !== 'string' || !raw.code) return null;
  return {
    code: raw.code,
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : null,
    discount_type: raw.discount_type === 'FIXED' ? 'FIXED' : 'PERCENT',
    discount_value: toNumber(raw.discount_value),
    max_discount_amount: raw.max_discount_amount == null ? null : toNumber(raw.max_discount_amount),
    min_booking_amount: toNumber(raw.min_booking_amount),
    first_booking_only: raw.first_booking_only === true,
    ends_at: typeof raw.ends_at === 'string' ? raw.ends_at : '',
    saving: toNumber(raw.saving),
    would_apply: raw.would_apply !== false,
  };
};

const parseOfferCode = (value: unknown): string | null => {
  const code = typeof value === 'string' ? value.trim() : '';
  return isCodeInputValid(code) ? code : null;
};

const parseMinAmount = (value: unknown): number | null => {
  if (value == null) return null;
  const n = toNumber(value);
  return n > 0 ? n : null;
};

const toPublicOffer = (raw: any): PublicWorkerOffer | null => {
  if (!raw || typeof raw.id !== 'string') return null;
  const type = raw.discount_type === 'FIXED' ? 'FIXED' : raw.discount_type === 'PERCENT' ? 'PERCENT' : null;
  if (!type) return null;
  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title : '',
    discount_type: type,
    discount_value: toNumber(raw.discount_value),
    max_discount_amount: raw.max_discount_amount == null ? null : toNumber(raw.max_discount_amount),
    ends_at: typeof raw.ends_at === 'string' ? raw.ends_at : '',
    code: parseOfferCode(raw.code ?? raw.promo_code ?? raw.coupon_code),
    min_booking_amount: parseMinAmount(raw.min_booking_amount ?? raw.min_order_amount),
  };
};

/**
 * Offers & discounts client. Booking-service owns both systems; the gateway routes
 * /coupons and /promotions to it. Money is always PKR numbers; prices are server-computed.
 */
export const offersApi = {
  /**
   * POST /api/v1/coupons/validate: non-binding preview of a typed code (platform coupon OR worker promotion code).
   *
   * Resolves for both `valid: true` and `valid: false` (the server answers 200 with a reason).
   * Rejects for COUPON_ATTEMPTS_LOCKED (429), validation (400), auth, and network failures:
   * callers classify those by `error.code` / `error.status` (see the HTTP error shape in client.ts).
   */
  validateCode: async (request: ValidateCodeRequest, signal?: AbortSignal): Promise<ValidateCodeResult> => {
    const payload: ValidateCodeRequest = { ...request, coupon_code: trimCode(request.coupon_code) };
    const response = await apiClient.post('/coupons/validate', payload, signal ? { signal } : undefined);
    const data: any = unwrapEnvelope<any>(response.data);

    if (!data || typeof data !== 'object' || typeof data.valid !== 'boolean') {
      throw { code: 'INVALID_RESPONSE', message: 'Unexpected response while checking the code.' };
    }

    if (data.valid) {
      return {
        valid: true,
        preview_only: true,
        coupon: {
          code: String(data.coupon?.code ?? payload.coupon_code),
          title: String(data.coupon?.title ?? ''),
          ends_at: String(data.coupon?.ends_at ?? ''),
        },
        pricing: toPricingView(data.pricing),
        items: normalizeLines(data.items) ?? [],
        discount: toDecision(data.discount),
        // Only worker promotions carry `funding`; absence means a platform coupon (B8).
        funding: data.funding === 'WORKER' ? 'WORKER' : undefined,
      };
    }

    return {
      valid: false,
      preview_only: true,
      reason_code: String(data.reason_code ?? 'COUPON_NOT_VALID'),
      message: String(data.message ?? ''),
      pricing: toPricingView(data.pricing),
      items: normalizeLines(data.items) ?? [],
      discount: data.discount ? toDecision(data.discount) : null,
    };
  },

  /**
   * POST /api/v1/coupons/available: the authoritative checkout price for this customer (an automatic worker
   * offer already applied) plus the platform coupons they can use for exactly this booking.
   */
  getCheckoutOffers: async (params: BookingQuoteParams, signal?: AbortSignal): Promise<CheckoutOffers> => {
    const response = await apiClient.post('/coupons/available', params, signal ? { signal } : undefined);
    const data: any = unwrapEnvelope<any>(response.data);
    if (!data || typeof data !== 'object' || !data.pricing) {
      throw { code: 'INVALID_RESPONSE', message: 'Unexpected response while loading your price.' };
    }
    return {
      pricing: toPricingView(data.pricing),
      items: normalizeLines(data.items) ?? [],
      discount: toDecision(data.discount),
      coupons: (Array.isArray(data.coupons) ? data.coupons : [])
        .map(toAvailableCoupon)
        .filter((c: AvailableCoupon | null): c is AvailableCoupon => c !== null),
    };
  },

  /**
   * GET /api/v1/promotions/worker/:workerId: public, a worker's active AUTOMATIC offers (max 10).
   * Carries no conditions and is not per-user (B5).
   */
  getWorkerOffers: async (workerId: string, signal?: AbortSignal): Promise<PublicWorkerOffer[]> => {
    // The server answers [] for a non-UUID; skip the round trip.
    if (!isValidUUID(workerId)) return [];
    const response = await apiClient.get(`/promotions/worker/${workerId}`, signal ? { signal } : undefined);
    const data = unwrapEnvelope<unknown>(response.data);
    if (!Array.isArray(data)) return [];
    return data.map(toPublicOffer).filter((o): o is PublicWorkerOffer => o !== null);
  },
};
