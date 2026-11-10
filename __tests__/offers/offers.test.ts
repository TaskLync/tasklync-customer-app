import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  buildBreakdownRows,
  cancelDiscountNotice,
  classifyCreateDiscountFailure,
  discountErrorMessage,
  formatBadgePercent,
  formatEndsIn,
  formatOfferValue,
  getBookingSavings,
  isCodeInputValid,
  isOfferLive,
  lockoutRemainingMs,
  LOCKOUT_WINDOW_MS,
  normalizeDiscountFields,
  parseSearchPromotion,
  quoteParamsHash,
  toNumber,
  unwrapEnvelope,
} from '../../src/utils/offers.ts';

const NOW = Date.parse('2026-11-09T10:00:00.000Z');
const inMs = (ms: number) => new Date(NOW + ms).toISOString();

describe('offer labels (spec 8.2)', () => {
  test('PERCENT without cap', () => {
    assert.strictEqual(
      formatOfferValue({ discount_type: 'PERCENT', discount_value: 15, max_discount_amount: null }),
      '15% off'
    );
  });

  test('PERCENT with cap', () => {
    assert.strictEqual(
      formatOfferValue({ discount_type: 'PERCENT', discount_value: 10, max_discount_amount: 500 }),
      '10% off (up to Rs. 500)'
    );
  });

  test('FIXED', () => {
    assert.strictEqual(
      formatOfferValue({ discount_type: 'FIXED', discount_value: 1200, max_discount_amount: null }),
      'Rs. 1,200 off'
    );
  });

  test('search badge rounds the approximate percent and hides zero', () => {
    assert.strictEqual(formatBadgePercent({ discount_pct: 14.6 }), '15% off');
    assert.strictEqual(formatBadgePercent({ discount_pct: 0 }), null);
    assert.strictEqual(formatBadgePercent({ discount_pct: 0.3 }), null);
  });
});

describe('expiry (spec 8.1)', () => {
  test('an offer whose ends_at is past is not live', () => {
    assert.strictEqual(isOfferLive(inMs(-1000), NOW), false);
    assert.strictEqual(isOfferLive(inMs(1000), NOW), true);
  });

  test('unparseable dates are not hidden', () => {
    assert.strictEqual(isOfferLive('nonsense', NOW), true);
  });

  test('ends-in copy picks the largest sensible unit', () => {
    assert.strictEqual(formatEndsIn(inMs(2 * 86_400_000 + 5000), NOW), 'Ends in 2d');
    assert.strictEqual(formatEndsIn(inMs(5 * 3_600_000 + 5000), NOW), 'Ends in 5h');
    assert.strictEqual(formatEndsIn(inMs(20 * 60_000 + 5000), NOW), 'Ends in 20m');
    assert.strictEqual(formatEndsIn(inMs(30_000), NOW), 'Ends in <1m');
    assert.strictEqual(formatEndsIn(inMs(-1), NOW), null);
  });

  test('search promotion parsing drops unusable values', () => {
    assert.strictEqual(parseSearchPromotion(null), null);
    assert.strictEqual(parseSearchPromotion({ title: 'x', discount_pct: 0, ends_at: inMs(1000) }), null);
    assert.strictEqual(parseSearchPromotion({ title: 'x', discount_pct: 10 }), null);
    assert.deepStrictEqual(parseSearchPromotion({ title: 'Spring', discount_pct: '12.5', ends_at: 'z' }), {
      title: 'Spring',
      discount_pct: 12.5,
      ends_at: 'z',
    });
  });
});

describe('breakdown rows (spec 8.5): PLATFORM vs WORKER arithmetic', () => {
  test('platform coupon shows subtotal, fee and discount, which reconcile with the total', () => {
    const rows = buildBreakdownRows({
      subtotalBeforeDiscount: 1000,
      platformFee: 50,
      discountAmount: 100,
      funding: 'PLATFORM',
    });
    assert.deepStrictEqual(
      rows.map((r) => [r.key, r.amount]),
      [
        ['subtotal', 1000],
        ['platformFee', 50],
        ['discount', -100],
      ]
    );
    // 1000 + 50 - 100 = 950 = estimated_total
    assert.strictEqual(rows.reduce((sum, r) => sum + r.amount, 0), 950);
  });

  test('worker promotion shows only fee and savings (lines would not reconcile)', () => {
    const rows = buildBreakdownRows({
      subtotalBeforeDiscount: 1000,
      platformFee: 45,
      discountAmount: 105,
      funding: 'WORKER',
    });
    assert.deepStrictEqual(
      rows.map((r) => r.key),
      ['platformFee', 'saved']
    );
  });

  test('unknown funding takes the safe form', () => {
    const rows = buildBreakdownRows({ subtotalBeforeDiscount: 1000, platformFee: 45, discountAmount: 105, funding: null });
    assert.deepStrictEqual(
      rows.map((r) => r.key),
      ['platformFee', 'saved']
    );
  });

  test('no discount, no rows', () => {
    assert.deepStrictEqual(buildBreakdownRows({ platformFee: 50, discountAmount: 0, funding: null }), []);
  });
});

describe('booking discount snapshot (spec 3.3, B17)', () => {
  test('NUMERIC strings are coerced', () => {
    const f = normalizeDiscountFields({
      subtotal_before_discount: '1000.00',
      discount_amount: '105.00',
      coupon_code_masked: 'SU****R',
      discount_funding: 'PLATFORM',
      coupon_id: 'c1',
    });
    assert.strictEqual(f.subtotal_before_discount, 1000);
    assert.strictEqual(f.discount_amount, 105);
    assert.strictEqual(f.discount_funding, 'PLATFORM');
    assert.strictEqual(f.promotion_id, null);
  });

  test('a booking without a discount reads as zero / null', () => {
    const f = normalizeDiscountFields({ discount_amount: null, subtotal_before_discount: null });
    assert.strictEqual(f.discount_amount, 0);
    assert.strictEqual(f.subtotal_before_discount, null);
    assert.strictEqual(getBookingSavings(f).hasDiscount, false);
  });

  test('automatic promotions have no masked code: chip says "Offer applied"', () => {
    const s = getBookingSavings({ discount_amount: 105, discount_funding: 'WORKER', coupon_code_masked: null });
    assert.strictEqual(s.chipLabel, 'Offer applied');
    assert.strictEqual(s.sourceLabel, 'Worker offer');
  });

  test('coupons show the masked code and "Promo code"', () => {
    const s = getBookingSavings({ discount_amount: 100, discount_funding: 'PLATFORM', coupon_code_masked: 'SU****R' });
    assert.strictEqual(s.chipLabel, 'SU****R');
    assert.strictEqual(s.sourceLabel, 'Promo code');
  });

  test('toNumber is defensive', () => {
    assert.strictEqual(toNumber('12.5'), 12.5);
    assert.strictEqual(toNumber(undefined), 0);
    assert.strictEqual(toNumber('abc'), 0);
    assert.strictEqual(toNumber(NaN), 0);
  });
});

describe('error handling (spec 6.6, 10.3)', () => {
  test('server text is used verbatim when it is specific', () => {
    assert.strictEqual(
      discountErrorMessage('COUPON_MIN_AMOUNT', 'This coupon needs a booking of at least PKR 1500.'),
      'This coupon needs a booking of at least PKR 1500.'
    );
  });

  test('the HTTP layer rewrites 409/429 bodies; the documented text is restored by code', () => {
    assert.strictEqual(
      discountErrorMessage('COUPON_NO_LONGER_AVAILABLE', 'Something went wrong. Please try again.'),
      'This coupon just ran out. Continue without it or try another.'
    );
    assert.strictEqual(
      discountErrorMessage('COUPON_ATTEMPTS_LOCKED', 'Too many requests. Please wait a moment and try again.'),
      'Too many wrong codes. Try again in a few minutes.'
    );
  });

  test('COUPON_NOT_VALID stays opaque', () => {
    assert.strictEqual(discountErrorMessage('COUPON_NOT_VALID', ''), 'This coupon is not valid.');
  });

  test('create-time failures route to the right recovery', () => {
    assert.strictEqual(classifyCreateDiscountFailure('COUPON_NO_LONGER_AVAILABLE'), 'continue_without');
    assert.strictEqual(classifyCreateDiscountFailure('PROMOTION_NO_LONGER_AVAILABLE'), 'continue_without');
    assert.strictEqual(classifyCreateDiscountFailure('COUPON_ATTEMPTS_LOCKED'), 'continue_without');
    for (const code of [
      'COUPON_USER_LIMIT_REACHED',
      'COUPON_NOT_FIRST_BOOKING',
      'COUPON_MIN_AMOUNT',
      'COUPON_NOT_APPLICABLE',
      'COUPON_NOT_VALID',
    ]) {
      assert.strictEqual(classifyCreateDiscountFailure(code), 'clear', code);
    }
  });

  test('non-discount failures (slot conflicts, COD limit) are not claimed', () => {
    assert.strictEqual(classifyCreateDiscountFailure('SLOT_NOT_AVAILABLE'), null);
    assert.strictEqual(classifyCreateDiscountFailure('AMOUNT_EXCEEDS_COD_LIMIT'), null);
    assert.strictEqual(classifyCreateDiscountFailure(undefined), null);
  });

  test('lockout window is the documented 15 minutes', () => {
    assert.strictEqual(LOCKOUT_WINDOW_MS, 900_000);
    assert.strictEqual(lockoutRemainingMs(NOW, NOW + 60_000), 840_000);
    assert.strictEqual(lockoutRemainingMs(NOW, NOW + LOCKOUT_WINDOW_MS + 1), 0);
    assert.strictEqual(lockoutRemainingMs(null, NOW), 0);
  });
});

describe('code input and parameter identity (spec 8.3, 10.2)', () => {
  test('request schema: trimmed, 3..32 chars', () => {
    assert.strictEqual(isCodeInputValid('  ab '), false);
    assert.strictEqual(isCodeInputValid(' abc '), true);
    assert.strictEqual(isCodeInputValid('a'.repeat(32)), true);
    assert.strictEqual(isCodeInputValid('a'.repeat(33)), false);
  });

  const base = {
    worker_id: 'w',
    category_id: 'c',
    items: [{ service_id: 's', quantity: 1 }],
    scheduled_at: '2026-11-10T05:00:00.000Z',
    duration_hours: 2,
    latitude: 31.4,
    longitude: 73.1,
    is_urgent: false,
  };

  test('every priced parameter changes the hash', () => {
    const h = quoteParamsHash(base);
    assert.strictEqual(quoteParamsHash({ ...base }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, is_urgent: true }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, duration_hours: 3 }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, scheduled_at: '2026-11-10T06:00:00.000Z' }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, latitude: 31.5 }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, longitude: 73.2 }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, worker_id: 'w2' }), h);
    // quantity and the set of services are priced by the server, so they void a previewed code too
    assert.notStrictEqual(quoteParamsHash({ ...base, items: [{ service_id: 's', quantity: 3 }] }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, items: [{ service_id: 's', quantity: 1 }, { service_id: 't', quantity: 1 }] }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, category_id: 'c2' }), h);
    assert.notStrictEqual(quoteParamsHash({ ...base, items: [{ service_id: 's2', quantity: 1 }] }), h);
  });
});

describe('response envelope (spec 2.3, B14)', () => {
  test('reads {success, data}', () => {
    assert.deepStrictEqual(unwrapEnvelope({ success: true, data: { valid: true } }), { valid: true });
  });

  test('reads the documented {status: "success", data} variant', () => {
    assert.deepStrictEqual(unwrapEnvelope({ status: 'success', data: [1] }), [1]);
  });

  test('passes through a bare body', () => {
    assert.deepStrictEqual(unwrapEnvelope({ valid: false }), { valid: false });
  });
});

describe('cancel warning (spec 8.6)', () => {
  test('PENDING: returned. ACCEPTED: not returned', () => {
    assert.match(cancelDiscountNotice('PENDING', true)?.text ?? '', /will be returned/);
    assert.match(cancelDiscountNotice('ACCEPTED', true)?.text ?? '', /will not be returned/);
    assert.strictEqual(cancelDiscountNotice('ACCEPTED', true)?.tone, 'warning');
  });

  test('no discount, no notice; other states promise nothing', () => {
    assert.strictEqual(cancelDiscountNotice('PENDING', false), null);
    assert.strictEqual(cancelDiscountNotice('IN_PROGRESS', true), null);
  });
});

// ─── Checkout / booking-details pricing presentation ───────────────────────

import {
  appliedDiscountName,
  bookingItemDiscount,
  buildPriceSummaryRows,
  discountValueLabel,
  normalizeLines,
} from '../../src/utils/offers.ts';

describe('discount presentation', () => {
  test('value labels', () => {
    assert.strictEqual(discountValueLabel('PERCENT', 10), '10% OFF');
    assert.strictEqual(discountValueLabel('FIXED', 200), 'Rs. 200 OFF');
  });

  test('names: a code is named after the code, an automatic offer after the worker', () => {
    assert.strictEqual(appliedDiscountName({ source: 'COUPON', code: 'SAVE10' }), 'Coupon SAVE10');
    assert.strictEqual(appliedDiscountName({ source: 'WORKER_OFFER', code: null }), 'Worker offer');
  });
});

describe('buildPriceSummaryRows (Rs. 1,500 booking)', () => {
  test('no discount: original price + platform fee only', () => {
    const rows = buildPriceSummaryRows({ originalAmount: 1500, baseAmount: 1500, platformFee: 75 });
    assert.deepStrictEqual(rows.map((r) => [r.key, r.amount]), [['original', 1500], ['platformFee', 75]]);
  });

  test('coupon: original, signed discount with code and percent, fee; rows reconcile to the total', () => {
    const rows = buildPriceSummaryRows({
      originalAmount: 1500,
      baseAmount: 1500,
      platformFee: 75,
      discount: { name: 'Coupon SAVE10', valueLabel: '10% OFF', amount: 150 },
    });
    assert.deepStrictEqual(rows.map((r) => r.key), ['original', 'discount', 'platformFee']);
    const discount = rows[1]!;
    assert.strictEqual(discount.label, 'Coupon SAVE10');
    assert.strictEqual(discount.hint, '10% OFF');
    assert.strictEqual(discount.amount, -150);
    assert.strictEqual(rows.reduce((a, r) => a + r.amount, 0), 1425); // 1500 - 150 + 75
  });

  test('surge shows as its own row only when the server subtotal exceeds the base', () => {
    const rows = buildPriceSummaryRows({ originalAmount: 1950, baseAmount: 1500, platformFee: 97.5 });
    assert.deepStrictEqual(rows.map((r) => [r.key, r.amount]), [['base', 1500], ['surge', 450], ['platformFee', 97.5]]);
  });

  test('a zero discount adds no discount row', () => {
    const rows = buildPriceSummaryRows({
      originalAmount: 500, platformFee: 25, discount: { name: 'Coupon X', valueLabel: null, amount: 0 },
    });
    assert.ok(!rows.some((r) => r.key === 'discount'));
  });
});

describe('bookingItemDiscount reconciles stored booking values', () => {
  test('worker offer: 1500 subtotal, 10% off, fee recomputed on 1350', () => {
    assert.strictEqual(
      bookingItemDiscount({ subtotal_before_discount: 1500, estimated_total: 1417.5, platform_fee: 67.5 }),
      150
    );
  });
  test('coupon: fee untouched', () => {
    assert.strictEqual(
      bookingItemDiscount({ subtotal_before_discount: 1500, estimated_total: 1425, platform_fee: 75 }),
      150
    );
  });
  test('no snapshot / no discount => 0', () => {
    assert.strictEqual(bookingItemDiscount({ subtotal_before_discount: null, estimated_total: 525, platform_fee: 25 }), 0);
    assert.strictEqual(bookingItemDiscount({ subtotal_before_discount: 500, estimated_total: 525, platform_fee: 25 }), 0);
  });
});

describe('booking snapshot survives reopening (normalizeDiscountFields / getBookingSavings)', () => {
  const row = {
    subtotal_before_discount: '1500.00',
    discount_amount: '157.50',
    discount_funding: 'PLATFORM',
    coupon_code: 'SAVE10',
    coupon_code_masked: 'SA***0',
    discount_type: 'PERCENT',
    discount_value: '10.00',
    discount_title: 'Welcome 10',
    items: [{ service_id: 'a', name: 'Fan Installation', quantity: 3, unit_price: '500.00', line_total: '1500.00', price_type: 'fixed' }],
  };

  test('exact code, percent and lines are kept; numbers coerced', () => {
    const f = normalizeDiscountFields(row);
    assert.strictEqual(f.coupon_code, 'SAVE10');
    assert.strictEqual(f.discount_type, 'PERCENT');
    assert.strictEqual(f.discount_value, 10);
    assert.strictEqual(f.items?.[0]?.quantity, 3);
    assert.strictEqual(f.items?.[0]?.line_total, 1500);
  });

  test('details show the EXACT code (not the masked one) and the percent', () => {
    const s = getBookingSavings(normalizeDiscountFields(row));
    assert.strictEqual(s.code, 'SAVE10');
    assert.strictEqual(s.chipLabel, 'SAVE10');
    assert.strictEqual(s.rowLabel, 'Coupon SAVE10');
    assert.strictEqual(s.valueLabel, '10% OFF');
  });

  test('legacy booking with only a masked code still renders', () => {
    const s = getBookingSavings(normalizeDiscountFields({ discount_amount: 100, discount_funding: 'PLATFORM', coupon_code_masked: 'SU***R' }));
    assert.strictEqual(s.code, null);
    assert.strictEqual(s.chipLabel, 'SU***R');
    assert.strictEqual(s.valueLabel, null);
  });

  test('items arrive as a JSON string from some drivers', () => {
    assert.strictEqual(normalizeLines(JSON.stringify(row.items))?.length, 1);
    assert.strictEqual(normalizeLines('not json'), null);
    assert.strictEqual(normalizeLines(null), null);
  });
});

describe('server messages for the new stacking outcome', () => {
  test('COUPON_NOT_STACKABLE is a known discount error and keeps the server wording', () => {
    assert.strictEqual(
      discountErrorMessage('COUPON_NOT_STACKABLE', "Your Worker 10% off already saves you more, so this code can't be added on top."),
      "Your Worker 10% off already saves you more, so this code can't be added on top."
    );
    assert.strictEqual(discountErrorMessage('COUPON_NOT_STACKABLE'), 'Only one discount can be used per booking.');
  });
});
