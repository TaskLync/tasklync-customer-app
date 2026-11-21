import { test, describe } from 'node:test';
import assert from 'node:assert';
import { computeRefundPolicy } from '../../src/utils/refundPolicy.ts';
import { toPublicPricingConfig } from '../../src/utils/feeDisplay.ts';

const now = new Date('2026-11-20T10:00:00Z');
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
const accepted = (h: number, extra: Record<string, unknown> = {}) =>
  ({ status: 'ACCEPTED', estimated_total: 1200, scheduled_at: inHours(h), ...extra }) as any;

describe('cancellation refund preview uses the admin settings, never fixed numbers', () => {
  test('cancellation fees switched off: every customer cancellation shows a full refund', () => {
    const cfg = toPublicPricingConfig({ cancellation_fee: { enabled: false, over_24h_percent: 10, within_24h_percent: 50 } });
    for (const h of [48, 5]) {
      const r = computeRefundPolicy(accepted(h), cfg.cancellation, now)!;
      assert.strictEqual(r.percentage, 100);
      assert.strictEqual(r.estimatedRefundAmount, 1200);
      assert.match(r.reason, /no cancellation fee/i);
    }
    const arrived = computeRefundPolicy(accepted(-1, { arrived_at: now.toISOString() }), cfg.cancellation, now)!;
    assert.strictEqual(arrived.percentage, 100);
  });

  test('admin-configured fees are applied as set', () => {
    const cfg = toPublicPricingConfig({
      cancellation_fee: { enabled: true, over_24h_percent: 5, within_24h_percent: 25, after_arrival_percent: 40 },
    });
    assert.strictEqual(computeRefundPolicy(accepted(48), cfg.cancellation, now)!.estimatedRefundAmount, 1140);
    assert.strictEqual(computeRefundPolicy(accepted(5), cfg.cancellation, now)!.estimatedRefundAmount, 900);
    assert.strictEqual(
      computeRefundPolicy(accepted(-1, { arrived_at: now.toISOString() }), cfg.cancellation, now)!.estimatedRefundAmount,
      720,
    );
  });

  test('before the worker accepts it is always free, even with fees on', () => {
    const r = computeRefundPolicy({ status: 'PENDING', estimated_total: 1200 } as any, null, now)!;
    assert.strictEqual(r.percentage, 100);
  });

  test('settings not loaded (or an older server): no estimate instead of a guessed fee', () => {
    assert.strictEqual(toPublicPricingConfig({}).cancellation, null);
    assert.strictEqual(computeRefundPolicy(accepted(48), null, now), null);
  });

  test('no-show fee is read from the server and 0 when switched off', () => {
    assert.strictEqual(toPublicPricingConfig({ no_show_fee: { enabled: false, amount: 500 } }).noShowFee, 0);
    assert.strictEqual(toPublicPricingConfig({ no_show_fee: { enabled: true, amount: 300 } }).noShowFee, 300);
  });
});
