import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatMinOrder, formatOfferCap, formatOfferHeadline } from '../../src/utils/offers.ts';

describe('offer detail formatting (real fields only)', () => {
  test('headline for percent and fixed offers', () => {
    assert.strictEqual(formatOfferHeadline({ discount_type: 'PERCENT', discount_value: 15 }), '15% off');
    assert.strictEqual(formatOfferHeadline({ discount_type: 'FIXED', discount_value: 200 }), 'Rs. 200 off');
  });

  test('minimum order only when the backend sent a positive amount', () => {
    assert.strictEqual(formatMinOrder({ min_booking_amount: 1500 }), 'Min. order Rs. 1,500');
    assert.strictEqual(formatMinOrder({ min_booking_amount: 0 }), null);
    assert.strictEqual(formatMinOrder({ min_booking_amount: null }), null);
    assert.strictEqual(formatMinOrder({}), null);
  });

  test('cap only for a capped percent offer', () => {
    assert.strictEqual(
      formatOfferCap({ discount_type: 'PERCENT', max_discount_amount: 500 }),
      'Up to Rs. 500'
    );
    assert.strictEqual(formatOfferCap({ discount_type: 'PERCENT', max_discount_amount: null }), null);
    assert.strictEqual(formatOfferCap({ discount_type: 'FIXED', max_discount_amount: 500 }), null);
  });
});
