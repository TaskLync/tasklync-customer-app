import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildInvoiceView, formatMoney, invoiceFileBase } from '../../src/utils/invoiceView.ts';
import { buildInvoiceHtml } from '../../src/utils/invoiceHtml.ts';
import { readableAddress } from '../../src/utils/addressSelect.ts';
import type { StructuredInvoiceData } from '../../src/types/booking.types.ts';

const base = (over: Partial<StructuredInvoiceData> = {}): StructuredInvoiceData => ({
  kind: 'structured',
  invoice_number: 'INV-90093D64',
  issued_at: '2026-11-21T09:40:00.000Z', // 2:40 PM PKT
  booking_id: 'b1',
  customer: { name: 'Ayesha Khan', address: 'House 12, Street 4, Gulberg, Lahore' },
  provider: { name: 'Bilal Ahmed', category: 'AC Repair' },
  category: 'AC Repair',
  line_items: [
    { id: 'a', name: 'AC General Service', quantity: 1, unit_price: 1500, total_price: 1500 },
    { id: 'b', name: 'AC Filter Cleaning', quantity: 1, unit_price: 500, total_price: 500 },
  ],
  subtotal: 2000,
  platform_fee: 0,
  total: 2000,
  currency: 'PKR',
  payment_method: { type: 'cash', status: 'PAID', label: 'Cash on Delivery', paid_at: '2026-11-21T09:40:00.000Z' },
  ...over,
});

describe('buildInvoiceView', () => {
  test('lists the real services under their category, with a free platform fee', () => {
    const v = buildInvoiceView(base());
    assert.deepStrictEqual(v.lines.map((l) => [l.name, l.amount]), [
      ['AC General Service', 'PKR 1,500'],
      ['AC Filter Cleaning', 'PKR 500'],
    ]);
    assert.strictEqual(v.serviceCategory, 'AC Repair');
    assert.deepStrictEqual(v.summary.map((r) => [r.key, r.value]), [
      ['subtotal', 'PKR 2,000'],
      ['platformFee', 'FREE'],
    ]);
    assert.strictEqual(v.totalLabel, 'Total paid');
    assert.strictEqual(v.total, 'PKR 2,000');
  });

  test('COD payment line reads in PKT and never mentions escrow', () => {
    const v = buildInvoiceView(base());
    assert.strictEqual(v.paymentMethod, 'Cash on Delivery');
    assert.strictEqual(v.paymentNote, 'Paid on Nov 21, 2026 at 2:40 PM');
    assert.strictEqual(v.paymentReference, null);
    assert.ok(!JSON.stringify(v).toLowerCase().includes('escrow'));
  });

  test('quantity detail only when more than one unit', () => {
    const v = buildInvoiceView(base({
      line_items: [{ id: 'x', name: 'Ceiling Fan Install', quantity: 3, unit_price: 750, total_price: 2250 }],
      subtotal: 2250, total: 2250,
    }));
    assert.strictEqual(v.lines[0]!.detail, '3 × PKR 750');
    assert.strictEqual(buildInvoiceView(base()).lines[0]!.detail, null);
  });

  test('discount, fee and tax rows appear only with a value; zero rows are left out', () => {
    const v = buildInvoiceView(base({ discount: 200, platform_fee: 100, platform_fee_percent: 5, tax_amount: 0, total: 1900 }));
    assert.deepStrictEqual(v.summary.map((r) => r.key), ['subtotal', 'discount', 'platformFee']);
    assert.strictEqual(v.summary[1]!.kind, 'discount');
    assert.strictEqual(v.summary[1]!.value, '− PKR 200');
    assert.strictEqual(v.summary[2]!.value, 'PKR 100');
    const withTax = buildInvoiceView(base({ tax_amount: 160, tax_label: 'GST', tax_percent: 8 }));
    assert.ok(withTax.summary.some((r) => r.key === 'tax' && r.value === 'PKR 160'));
  });

  test('status drives the total label and payment note', () => {
    const pending = buildInvoiceView(base({ payment_method: { type: 'cash', status: 'PENDING', label: 'Cash on Delivery' } }));
    assert.strictEqual(pending.statusLabel, 'Pending');
    assert.strictEqual(pending.totalLabel, 'Total due');
    assert.strictEqual(pending.paymentNote, 'Not paid yet');
    const refunded = buildInvoiceView(base({ payment_method: { type: 'cash', status: 'REFUNDED' } }));
    assert.strictEqual(refunded.totalLabel, 'Total refunded');
    assert.strictEqual(refunded.paymentNote, 'Refunded');
    assert.strictEqual(refunded.paymentMethod, 'Cash');
  });

  test('a single line that only repeats the category does not print the category twice', () => {
    const v = buildInvoiceView(base({
      line_items: [{ id: 's', name: 'AC Repair', quantity: 1, unit_price: 2000, total_price: 2000 }],
    }));
    assert.strictEqual(v.serviceCategory, null);
  });

  test('custom quote keeps the request title and marks the section', () => {
    const v = buildInvoiceView(base({
      is_custom_quote: true,
      line_items: [
        { id: 'w', name: 'Main breaker tripping intermittently', quantity: 1, unit_price: 3000, total_price: 3000 },
        { id: 'i', name: 'Inspection fee', quantity: 1, unit_price: 500, total_price: 500 },
      ],
      subtotal: 3500, total: 3500,
    }));
    assert.strictEqual(v.isCustomQuote, true);
    assert.strictEqual(v.lines[0]!.name, 'Main breaker tripping intermittently');
  });

  test('missing optional party data is null, never placeholder text', () => {
    const v = buildInvoiceView(base({ customer: { name: '' }, provider: { name: '' } }));
    assert.strictEqual(v.customerName, null);
    assert.strictEqual(v.customerAddress, null);
    assert.strictEqual(v.providerName, null);
  });
});

describe('formatting', () => {
  test('money keeps decimals only when present', () => {
    assert.strictEqual(formatMoney(2000, 'PKR'), 'PKR 2,000');
    assert.strictEqual(formatMoney(1234.5, 'PKR'), 'PKR 1,234.50');
  });
  test('file name', () => {
    assert.strictEqual(invoiceFileBase('INV-90093D64'), 'TaskLync-Invoice-INV-90093D64');
    assert.strictEqual(invoiceFileBase('INV/90 093'), 'TaskLync-Invoice-INV90093');
  });
});

describe('readableAddress', () => {
  test('drops a leading Plus Code, keeps the readable part', () => {
    assert.strictEqual(readableAddress('7JCM+QX, Gulberg III, Lahore'), 'Gulberg III, Lahore');
    assert.strictEqual(readableAddress('7JCM+QX Gulberg III, Lahore'), 'Gulberg III, Lahore');
  });
  test('a Plus Code alone is not an address', () => {
    assert.strictEqual(readableAddress('7JCM+QX'), null);
    assert.strictEqual(readableAddress('  '), null);
    assert.strictEqual(readableAddress(undefined), null);
  });
  test('normal addresses pass through', () => {
    assert.strictEqual(readableAddress('House 12, Street 4, Lahore'), 'House 12, Street 4, Lahore');
  });
});

describe('buildInvoiceHtml', () => {
  test('contains every service, the total and the status; no escrow claim', () => {
    const html = buildInvoiceHtml(buildInvoiceView(base()));
    for (const s of ['AC General Service', 'AC Filter Cleaning', 'PKR 2,000', 'Total paid', 'PAID', 'INV-90093D64', 'Cash on Delivery']) {
      assert.ok(html.includes(s), `missing ${s}`);
    }
    assert.ok(!html.toLowerCase().includes('escrow'));
    assert.ok(html.includes('thead') && html.includes('page-break-inside: avoid'));
  });
  test('escapes user-entered text', () => {
    const html = buildInvoiceHtml(buildInvoiceView(base({ customer: { name: '<script>x</script> & Co' } })));
    assert.ok(!html.includes('<script>x'));
    assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt; &amp; Co'));
  });
  test('browser target: no browser header/footer room, repeating page margins, file-name title', () => {
    const html = buildInvoiceHtml(buildInvoiceView(base()), { target: 'browser', title: 'TaskLync-Invoice-INV-90093D64' });
    assert.ok(/@page\s*\{\s*size:\s*A4;\s*margin:\s*0;\s*\}/.test(html), '@page margin must be 0');
    assert.ok(html.includes('class="page-frame"') && html.includes('table-header-group') && html.includes('table-footer-group'));
    assert.ok(html.includes('<title>TaskLync-Invoice-INV-90093D64</title>'));
    // Only the invoice document: none of the app's UI copy.
    for (const s of ['Download invoice', 'PDF Document', 'Invoice &amp; Receipt', 'localhost']) {
      assert.ok(!html.includes(s), `unexpected ${s}`);
    }
  });
  test('device target keeps real page margins and no browser frame', () => {
    const html = buildInvoiceHtml(buildInvoiceView(base()));
    assert.ok(/@page \{ size: A4; margin: 40px 44px 40px 44px; \}/.test(html));
    assert.ok(!html.includes('page-frame"'));
  });
  test('colours are solid: no opacity or rgba anywhere in the document', () => {
    const html = buildInvoiceHtml(buildInvoiceView(base()), { target: 'browser' });
    assert.ok(!/opacity|rgba\(/i.test(html));
    assert.ok(html.includes('print-color-adjust: exact'));
  });
  test('long invoices render every line', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ id: `l${i}`, name: `Service line ${i + 1}`, quantity: 1, unit_price: 100, total_price: 100 }));
    const html = buildInvoiceHtml(buildInvoiceView(base({ line_items: many, subtotal: 6000, total: 6000 })));
    assert.strictEqual((html.match(/Service line \d+/g) ?? []).length, 60);
  });
});
