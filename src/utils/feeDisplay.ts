/**
 * How fees and tax are LABELLED on screen. Amounts always come from the server's pricing snapshot
 * (booking, quote or estimate); nothing here calculates a price.
 *
 * "FREE" is not a business rule: it is shown only because the server charged 0. If the admin turns
 * the platform fee on, the same code shows the real amount and percentage.
 */

const toNum = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

const pctText = (p: number) => `${Math.round(p * 100) / 100}%`;

/** True when the server charged no platform fee for this price. */
export function isFeeFree(amount: unknown): boolean {
  return toNum(amount) <= 0;
}

/** "Platform fee" or "Platform fee (5%)" when the server recorded a percentage above 0. */
export function platformFeeLabel(percent?: number | null): string {
  const p = toNum(percent);
  return p > 0 ? `Platform fee (${pctText(p)})` : 'Platform fee';
}

/** "FREE" when the server charged 0, otherwise the formatted amount. */
export function platformFeeValue(amount: unknown, format: (n: number) => string): string {
  return isFeeFree(amount) ? 'FREE' : format(toNum(amount));
}

/** Tax amount, or 0 when the price has no tax (tax is switched off, or the record predates tax). */
export function taxAmountOf(source: { tax_amount?: unknown } | null | undefined): number {
  return Math.max(0, toNum(source?.tax_amount));
}

/** "GST (16%)" / "Tax". Only shown when a tax amount is above 0. */
export function taxLabel(label?: string | null, percent?: number | null): string {
  const name = typeof label === 'string' && label.trim() ? label.trim() : 'Tax';
  const p = toNum(percent);
  return p > 0 ? `${name} (${pctText(p)})` : name;
}

/** Fee / tax snapshot fields a booking, quote or estimate may carry (booking-service migration 020). */
export interface FeeSnapshotFields {
  /** Platform fee percentage recorded when the price was made (null on older records). */
  customer_fee_percent?: number | null | undefined;
  tax_amount?: number | undefined;
  tax_label?: string | null | undefined;
  tax_percent?: number | null | undefined;
  /** Admin pricing configuration version that made this price (null on older records). */
  pricing_config_version?: number | null | undefined;
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Reads the snapshot off a server row. Absent fields stay absent (older servers / older bookings). */
export function normalizeFeeFields(raw: any): FeeSnapshotFields {
  const out: FeeSnapshotFields = {};
  const fee = numOrNull(raw?.customer_fee_percent);
  if (fee !== null) out.customer_fee_percent = fee;
  const tax = numOrNull(raw?.tax_amount);
  if (tax !== null) out.tax_amount = tax;
  if (typeof raw?.tax_label === 'string' && raw.tax_label.trim()) out.tax_label = raw.tax_label.trim();
  const taxPct = numOrNull(raw?.tax_percent);
  if (taxPct !== null) out.tax_percent = taxPct;
  const version = numOrNull(raw?.pricing_config_version);
  if (version !== null) out.pricing_config_version = version;
  return out;
}

/**
 * ACTIVE fee / tax settings (admin dashboard > Pricing & Commission) from GET /bookings/pricing-config.
 * Labels only ("Platform fee: FREE" in the cart before the server has priced a booking); never an amount.
 */
export interface PublicPricingConfig {
  version: number | null;
  customerFeeEnabled: boolean;
  customerFeePercent: number;
  taxEnabled: boolean;
  taxPercent: number;
  taxLabel: string;
  /**
   * Customer cancellation fee (share of the total kept) set by the admin. null when the server did not send it:
   * the app then shows no refund estimate rather than guessing a fee.
   */
  cancellation: CancellationTerms | null;
  /** Customer no-show fee in PKR (0 = none). */
  noShowFee: number;
}

/** Cancelling before the worker accepts is always free; these apply once the booking is accepted. */
export interface CancellationTerms {
  over24hPercent: number;
  within24hPercent: number;
  afterArrivalPercent: number;
}

const pctOrZero = (v: unknown) => Math.min(100, Math.max(0, toNum(v)));

export function toPublicPricingConfig(raw: any): PublicPricingConfig {
  const fee = raw?.customer_platform_fee ?? {};
  const tax = raw?.tax ?? {};
  const cancel = raw?.cancellation_fee;
  const noShow = raw?.no_show_fee ?? {};
  const version = toNum(raw?.version);
  return {
    cancellation:
      cancel && typeof cancel === 'object'
        ? cancel.enabled === true
          ? {
              over24hPercent: pctOrZero(cancel.over_24h_percent),
              within24hPercent: pctOrZero(cancel.within_24h_percent),
              afterArrivalPercent: pctOrZero(cancel.after_arrival_percent),
            }
          : { over24hPercent: 0, within24hPercent: 0, afterArrivalPercent: 0 }
        : null,
    noShowFee: noShow.enabled === true ? Math.max(0, toNum(noShow.amount)) : 0,
    version: version > 0 ? version : null,
    customerFeeEnabled: fee.enabled === true && toNum(fee.percent) > 0,
    customerFeePercent: toNum(fee.percent),
    taxEnabled: tax.enabled === true && toNum(tax.percent) > 0,
    taxPercent: toNum(tax.percent),
    taxLabel: typeof tax.label === 'string' && tax.label.trim() ? tax.label.trim() : 'Tax',
  };
}
