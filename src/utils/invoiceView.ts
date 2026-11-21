/**
 * One presentation model for an invoice, shared by the screen, the PDF and the image export, so all
 * three always show the same rows, labels and numbers. Pure: no React, no theme.
 */
import type { StructuredInvoiceData } from '../types/booking.types';
import { isFeeFree, platformFeeLabel, taxLabel } from './feeDisplay';
import { formatPKTDate, formatPKTTime } from './timezone';

export type InvoiceStatus = StructuredInvoiceData['payment_method']['status'];

export interface InvoiceViewLine {
  id: string;
  name: string;
  /** "2 × PKR 750", only when more than one unit was bought. */
  detail: string | null;
  amount: string;
}

export interface InvoiceViewRow {
  key: string;
  label: string;
  value: string;
  /** Discount rows read as savings. */
  kind: 'line' | 'discount';
}

export interface InvoiceView {
  invoiceNumber: string;
  issuedDate: string;
  status: InvoiceStatus;
  statusLabel: string;
  customerName: string | null;
  customerAddress: string | null;
  providerName: string | null;
  providerCategory: string | null;
  providerTaxId: string | null;
  /** Category heading above the lines; null when it would only repeat the single line's name. */
  serviceCategory: string | null;
  isCustomQuote: boolean;
  lines: InvoiceViewLine[];
  summary: InvoiceViewRow[];
  totalLabel: string;
  total: string;
  paymentMethod: string;
  /** "Paid on Nov 21, 2026 at 2:40 PM" / "Refunded" / "Not paid yet". */
  paymentNote: string | null;
  paymentReference: string | null;
}

export function formatMoney(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const digits = Math.abs(n % 1) > 0.004 ? 2 : 0;
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<InvoiceStatus, string> = { PAID: 'Paid', PENDING: 'Pending', REFUNDED: 'Refunded' };

const TOTAL_LABEL: Record<InvoiceStatus, string> = {
  PAID: 'Total paid',
  PENDING: 'Total due',
  REFUNDED: 'Total refunded',
};

const methodLabel = (pm: StructuredInvoiceData['payment_method']): string => {
  if (pm.label) return pm.label;
  if (pm.type === 'card') return [pm.brand ? pm.brand.toUpperCase() : 'Card', pm.last4 ? `•••• ${pm.last4}` : ''].join(' ').trim();
  if (pm.type === 'wallet') return pm.brand ? `${pm.brand} Wallet` : 'Mobile Wallet';
  return 'Cash';
};

export function buildInvoiceView(inv: StructuredInvoiceData): InvoiceView {
  const money = (n: number) => formatMoney(n, inv.currency);
  const status = inv.payment_method.status;

  const lines: InvoiceViewLine[] = inv.line_items.map((l) => ({
    id: l.id,
    name: l.name,
    detail: l.quantity > 1 ? `${l.quantity} × ${money(l.unit_price)}` : null,
    amount: money(l.total_price),
  }));

  // Rows that carry information only: no zero discount, no zero tax.
  const summary: InvoiceViewRow[] = [{ key: 'subtotal', label: 'Service subtotal', value: money(inv.subtotal), kind: 'line' }];
  if (inv.discount && inv.discount > 0) {
    summary.push({ key: 'discount', label: 'Discount', value: `− ${money(inv.discount)}`, kind: 'discount' });
  }
  summary.push({
    key: 'platformFee',
    label: platformFeeLabel(inv.platform_fee_percent),
    value: isFeeFree(inv.platform_fee) ? 'FREE' : money(inv.platform_fee),
    kind: 'line',
  });
  if (inv.tax_amount && inv.tax_amount > 0) {
    summary.push({ key: 'tax', label: taxLabel(inv.tax_label, inv.tax_percent), value: money(inv.tax_amount), kind: 'line' });
  }

  const paidAt = inv.payment_method.paid_at;
  let paymentNote: string | null = null;
  if (status === 'PAID' && paidAt) paymentNote = `Paid on ${formatPKTDate(paidAt)} at ${formatPKTTime(paidAt)}`;
  else if (status === 'REFUNDED') paymentNote = 'Refunded';
  else if (status === 'PENDING') paymentNote = 'Not paid yet';

  const category = inv.category?.trim() || inv.provider.category?.trim() || null;
  const onlyLineRepeatsCategory =
    inv.line_items.length === 1 && category !== null && inv.line_items[0]!.name.trim().toLowerCase() === category.toLowerCase();

  return {
    invoiceNumber: inv.invoice_number,
    issuedDate: formatPKTDate(inv.issued_at),
    status,
    statusLabel: STATUS_LABEL[status],
    customerName: inv.customer.name?.trim() || null,
    customerAddress: inv.customer.address?.trim() || null,
    providerName: inv.provider.name?.trim() || null,
    providerCategory: category,
    providerTaxId: inv.provider.tax_id?.trim() || null,
    serviceCategory: onlyLineRepeatsCategory ? null : category,
    isCustomQuote: Boolean(inv.is_custom_quote),
    lines,
    summary,
    totalLabel: TOTAL_LABEL[status],
    total: money(inv.total),
    paymentMethod: methodLabel(inv.payment_method),
    paymentNote,
    paymentReference: inv.payment_method.reference?.trim() || null,
  };
}

/** TaskLync-Invoice-INV-90093D64 (no extension). */
export const invoiceFileBase = (invoiceNumber: string) =>
  `TaskLync-Invoice-${invoiceNumber.replace(/[^A-Za-z0-9-]/g, '')}`;
