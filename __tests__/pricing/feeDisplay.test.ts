import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  isFeeFree,
  normalizeFeeFields,
  platformFeeLabel,
  platformFeeValue,
  taxAmountOf,
  taxLabel,
  toPublicPricingConfig,
} from '../../src/utils/feeDisplay.ts';
import { bookingItemDiscount, buildBreakdownRows, buildPriceSummaryRows } from '../../src/utils/offers.ts';

const rs = (n: number) => `Rs. ${n}`;

describe('platform fee shows FREE only because the server charged 0', () => {
  test('commission-free booking: service 1,200, fee FREE, no tax row', () => {
    const rows = buildPriceSummaryRows({ originalAmount: 1200, platformFee: 0, platformFeePercent: 0, taxAmount: 0 });
    assert.deepStrictEqual(
      rows.map((r) => [r.label, r.display ?? r.amount]),
      [['Service charges', 1200], ['Platform fee', 'FREE']],
    );
  });

  test('admin enables a 5% fee: the real amount and percent appear (no app update)', () => {
    const rows = buildPriceSummaryRows({ originalAmount: 1200, platformFee: 60, platformFeePercent: 5 });
    const fee = rows.find((r) => r.key === 'platformFee')!;
    assert.strictEqual(fee.label, 'Platform fee (5%)');
    assert.strictEqual(fee.display, undefined);
    assert.strictEqual(fee.amount, 60);
  });

  test('tax row appears only when the snapshot has tax', () => {
    const rows = buildPriceSummaryRows({ originalAmount: 1000, platformFee: 0, taxAmount: 160, taxLabel: 'GST', taxPercent: 16 });
    const tax = rows.find((r) => r.key === 'tax')!;
    assert.strictEqual(tax.label, 'GST (16%)');
    assert.strictEqual(tax.amount, 160);
  });

  test('"Original price" only next to a discount', () => {
    const rows = buildPriceSummaryRows({
      originalAmount: 1200, platformFee: 0, discount: { name: 'Coupon SAVE10', valueLabel: '10% OFF', amount: 120 },
    });
    assert.strictEqual(rows[0]!.label, 'Original price');
  });

  test('discount breakdown rows show FREE for a zero fee', () => {
    const rows = buildBreakdownRows({ subtotalBeforeDiscount: 1200, platformFee: 0, discountAmount: 120, funding: 'PLATFORM' });
    assert.strictEqual(rows.find((r) => r.key === 'platformFee')!.display, 'FREE');
  });

  test('item discount of a stored booking subtracts tax as well', () => {
    // 1000 service - 100 coupon + 0 fee + 144 tax = 1044
    assert.strictEqual(bookingItemDiscount({ subtotal_before_discount: 1000, estimated_total: 1044, platform_fee: 0, tax_amount: 144 }), 100);
    assert.strictEqual(bookingItemDiscount({ subtotal_before_discount: 1000, estimated_total: 900, platform_fee: 0 }), 100);
  });

  test('label helpers', () => {
    assert.strictEqual(isFeeFree('0.00'), true);
    assert.strictEqual(platformFeeLabel(null), 'Platform fee');
    assert.strictEqual(platformFeeValue(0, rs), 'FREE');
    assert.strictEqual(platformFeeValue('60', rs), 'Rs. 60');
    assert.strictEqual(taxLabel(null, 0), 'Tax');
    assert.strictEqual(taxAmountOf({ tax_amount: '12.50' }), 12.5);
    assert.strictEqual(taxAmountOf(null), 0);
  });

  test('snapshot fields are read from server rows (NUMERIC strings) and absent ones stay absent', () => {
    assert.deepStrictEqual(normalizeFeeFields({ customer_fee_percent: '0.00', tax_amount: '0.00', pricing_config_version: 2 }), {
      customer_fee_percent: 0, tax_amount: 0, pricing_config_version: 2,
    });
    assert.deepStrictEqual(normalizeFeeFields({}), {});
  });

  test('cart reads the public config: a switched-off fee is FREE even if a percent is stored', () => {
    const cfg = toPublicPricingConfig({
      version: 3,
      customer_platform_fee: { enabled: false, percent: 5 },
      tax: { enabled: false, percent: 16, label: 'GST' },
    });
    assert.strictEqual(cfg.customerFeeEnabled, false);
    assert.strictEqual(cfg.taxEnabled, false);
    assert.strictEqual(cfg.version, 3);
  });
});
