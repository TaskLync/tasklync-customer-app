/**
 * Builds a booking's invoice from the records the backend actually holds.
 *
 * Sources, all fetched in parallel and each optional:
 *   GET /bookings/:id/invoice        server invoice (used as-is where it has a value)
 *   GET /bookings/:id                booking: services snapshot (`items`), pricing snapshot, parties
 *   GET /payments/booking/:id        payment record: method, status, paid time
 * plus, only when needed, the custom request (title + accepted quote) and the saved address.
 *
 * Rules: nothing is invented. A missing optional value is left out (the UI hides it), never replaced
 * with placeholder text. The category is never presented as the purchased service when the real
 * service lines are known.
 */
import { apiClient } from '../api/client';
import { bookingApi, getPersistedBookings, isGenericWorkerName } from '../api/booking.api';
import { paymentApi } from '../api/payment.api';
import { customRequestApi } from '../api/customRequest.api';
import { userApi } from '../api/user.api';
import { useAuthStore } from '../../store/auth.store';
import { bookingItemDiscount, toNumber } from '../../utils/offers';
import { normalizeFeeFields } from '../../utils/feeDisplay';
import { readableAddress } from '../../utils/addressSelect';
import type {
  BookingDetails,
  InvoiceData,
  InvoiceLineItemData,
  InvoicePaymentMethodData,
  PdfInvoiceData,
  StructuredInvoiceData,
} from '../../types/booking.types';
import type { PaymentMethodCode, PaymentRecord } from '../../types/payment.types';

const settledValue = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "INV-90093D64": derived from the booking id, the same value the server would key the invoice by. */
export const invoiceNumberFor = (bookingId: string) =>
  `INV-${bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

const METHOD_LABELS: Record<PaymentMethodCode, string> = {
  CASH_ON_DELIVERY: 'Cash on Delivery',
  JAZZCASH_WALLET: 'JazzCash Wallet',
  EASYPAISA_WALLET: 'Easypaisa Wallet',
  JAZZCASH_CARD: 'Card (JazzCash)',
  RAAST: 'Raast',
  IBFT: 'Bank Transfer',
  BANK_CARD: 'Bank Card',
};

const methodType = (code: PaymentMethodCode | undefined): InvoicePaymentMethodData['type'] => {
  if (code === 'JAZZCASH_WALLET' || code === 'EASYPAISA_WALLET') return 'wallet';
  if (code === 'JAZZCASH_CARD' || code === 'BANK_CARD') return 'card';
  return 'cash';
};

function resolvePayment(
  payment: PaymentRecord | null,
  rawMethod: any,
  booking: BookingDetails | null,
): InvoicePaymentMethodData {
  const code = payment?.method;
  const paidStamp = text(payment?.paid_at) ?? text(payment?.cod_confirmed_at) ?? text(rawMethod?.paid_at);

  let status: InvoicePaymentMethodData['status'];
  if (payment?.status === 'REFUNDED' || booking?.status === 'REFUNDED' || rawMethod?.status === 'REFUNDED') {
    status = 'REFUNDED';
  } else if (payment) {
    // HELD: collected from the customer and awaiting release; RELEASED: settled. Both are paid for the customer.
    status = payment.status === 'HELD' || payment.status === 'RELEASED' || paidStamp ? 'PAID' : 'PENDING';
  } else if (rawMethod?.status === 'PAID' || rawMethod?.status === 'PENDING') {
    status = rawMethod.status;
  } else {
    status = booking?.is_payment_confirmed ? 'PAID' : 'PENDING';
  }

  const type = code ? methodType(code) : (rawMethod?.type === 'card' || rawMethod?.type === 'wallet' ? rawMethod.type : 'cash');
  const gatewayRef = text((payment as any)?.gateway_order_id) ?? text((payment as any)?.transaction_id) ?? text(rawMethod?.reference);

  return {
    type,
    status,
    ...(code ? { label: METHOD_LABELS[code] ?? code } : text(rawMethod?.label) ? { label: text(rawMethod.label)! } : {}),
    ...(text(rawMethod?.brand) ? { brand: text(rawMethod.brand)! } : {}),
    ...(text(rawMethod?.last4) ? { last4: text(rawMethod.last4)! } : {}),
    // A paid time only from a real payment timestamp; never the booking's completion time.
    ...(paidStamp && status !== 'PENDING' ? { paid_at: paidStamp } : {}),
    // Cash has no transaction reference worth printing.
    ...(gatewayRef && code !== 'CASH_ON_DELIVERY' ? { reference: gatewayRef } : {}),
  };
}

const linesFromServer = (raw: any): InvoiceLineItemData[] | null => {
  const list = raw?.line_items ?? raw?.lineItems;
  if (!Array.isArray(list) || list.length === 0) return null;
  const lines = list
    .map((item: any, idx: number): InvoiceLineItemData | null => {
      const name = text(item?.name);
      if (!name) return null;
      const quantity = Math.max(1, Math.round(toNumber(item.quantity)) || 1);
      const unit = toNumber(item.unit_price ?? item.unitPrice ?? item.price);
      const total = toNumber(item.total_price ?? item.totalPrice ?? item.line_total) || round2(unit * quantity);
      return { id: String(item.id ?? `line-${idx + 1}`), name, quantity, unit_price: unit || round2(total / quantity), total_price: total };
    })
    .filter((l): l is InvoiceLineItemData => l !== null);
  return lines.length > 0 ? lines : null;
};

const linesFromBookingSnapshot = (booking: BookingDetails | null): InvoiceLineItemData[] | null => {
  const items = (booking?.items ?? []).filter((l) => l.name.trim().length > 0);
  if (items.length === 0) return null;
  return items.map((l, idx) => ({
    id: `${l.service_id || 'svc'}-${idx}`,
    name: l.name.trim(),
    quantity: l.quantity,
    unit_price: l.unit_price,
    total_price: l.line_total || round2(l.unit_price * l.quantity),
  }));
};

async function linesFromCustomQuote(
  booking: BookingDetails,
  subtotal: number | null,
): Promise<InvoiceLineItemData[] | null> {
  if (!booking.custom_request_id) return null;
  try {
    const { request, activeQuote } = await customRequestApi.getRequestById(booking.custom_request_id);
    const title = text(request?.title) ?? text(booking.service_name);
    if (!title) return null;
    const work = toNumber(activeQuote?.work_price);
    const inspection = toNumber(activeQuote?.inspection_fee);
    const quoteSum = round2(work + inspection);
    // Use the quote's breakdown only when it is the quote this booking was priced from.
    if (activeQuote && work > 0 && (subtotal == null || Math.abs(quoteSum - subtotal) < 1)) {
      const lines: InvoiceLineItemData[] = [{ id: 'quote-work', name: title, quantity: 1, unit_price: work, total_price: work }];
      if (inspection > 0) {
        lines.push({ id: 'quote-inspection', name: 'Inspection fee', quantity: 1, unit_price: inspection, total_price: inspection });
      }
      return lines;
    }
    return subtotal != null ? [{ id: 'quote', name: title, quantity: 1, unit_price: subtotal, total_price: subtotal }] : null;
  } catch {
    return null;
  }
}

async function savedAddressText(addressId: string | undefined): Promise<string | null> {
  if (!addressId) return null;
  try {
    const list = await userApi.getAddresses();
    const match = Array.isArray(list) ? list.find((a) => a.id === addressId) : undefined;
    if (!match) return null;
    return readableAddress([match.address_line, match.city].filter(Boolean).join(', '));
  } catch {
    return null;
  }
}

export async function fetchInvoice(bookingId: string): Promise<InvoiceData> {
  const [invoiceRes, bookingRes, paymentRes] = await Promise.allSettled([
    apiClient.get<any>(`/bookings/${bookingId}/invoice`),
    bookingApi.getBookingDetails(bookingId),
    paymentApi.getPaymentByBookingId(bookingId),
  ]);

  const invoiceResponse = settledValue(invoiceRes);
  const raw: any = invoiceResponse ? invoiceResponse.data?.data ?? invoiceResponse.data ?? null : null;
  const booking: BookingDetails | null =
    settledValue(bookingRes) ?? getPersistedBookings().find((b) => b.id === bookingId) ?? null;
  const payment = settledValue(paymentRes);

  // The server issued a signed PDF: that document is the invoice.
  if (raw && (raw.kind === 'pdf' || (typeof raw.url === 'string' && raw.url.endsWith('.pdf')))) {
    const pdf: PdfInvoiceData = {
      kind: 'pdf',
      invoice_number: text(raw.invoice_number ?? raw.invoiceNumber) ?? invoiceNumberFor(bookingId),
      url: raw.url,
      issued_at: text(raw.issued_at ?? raw.issuedAt) ?? booking?.completed_at ?? booking?.created_at ?? new Date().toISOString(),
      ...(raw.total != null ? { total: toNumber(raw.total) } : booking ? { total: toNumber(booking.estimated_total) } : {}),
      currency: text(raw.currency) ?? booking?.currency ?? 'PKR',
    };
    return pdf;
  }

  if (!raw && !booking) {
    throw new Error("We couldn't load this invoice. Check your connection and try again.");
  }

  const fees = { ...normalizeFeeFields(booking ?? {}), ...normalizeFeeFields(raw ?? {}) };
  const platformFee = toNumber(raw?.platform_fee ?? raw?.platformFee ?? booking?.platform_fee);
  const taxAmount = fees.tax_amount != null ? toNumber(fees.tax_amount) : 0;
  const total = toNumber(raw?.total ?? booking?.estimated_total);
  const discount = raw?.discount != null ? toNumber(raw.discount) : booking ? bookingItemDiscount(booking) : 0;

  const knownSubtotal: number | null =
    raw?.subtotal != null
      ? toNumber(raw.subtotal)
      : booking?.subtotal_before_discount != null
        ? toNumber(booking.subtotal_before_discount)
        : null;

  // Purchased services, most specific source first.
  let isCustomQuote = false;
  let lines = linesFromServer(raw) ?? linesFromBookingSnapshot(booking);
  if (!lines && booking?.custom_request_id) {
    lines = await linesFromCustomQuote(booking, knownSubtotal);
    isCustomQuote = lines !== null;
  }
  const linesSum = lines ? round2(lines.reduce((s, l) => s + l.total_price, 0)) : null;
  const subtotal = knownSubtotal ?? linesSum ?? round2(total - platformFee - taxAmount + discount);

  if (!lines) {
    // Only one thing is known about what was bought: its name, or failing that its category.
    const name = text(booking?.service_name) ?? text(booking?.category_name) ?? text(raw?.provider?.category);
    lines = name ? [{ id: 'service', name, quantity: 1, unit_price: subtotal, total_price: subtotal }] : [];
  }

  const isCompany = Boolean(booking?.is_company || booking?.provider_type === 'COMPANY');
  const workerName = text(booking?.worker_name);
  const providerName =
    text(raw?.provider?.name) ??
    (isCompany ? text(booking?.provider_name) : null) ??
    (workerName && !isGenericWorkerName(workerName) ? workerName : null) ??
    text(booking?.provider_name) ??
    '';

  let address = readableAddress(raw?.customer?.address) ?? readableAddress(booking?.address_text);
  if (!address) address = await savedAddressText(booking?.address_id);

  const category = text(raw?.provider?.category) ?? text(booking?.category_name);

  const invoice: StructuredInvoiceData = {
    kind: 'structured',
    invoice_number: text(raw?.invoice_number ?? raw?.invoiceNumber) ?? invoiceNumberFor(bookingId),
    issued_at:
      text(raw?.issued_at ?? raw?.issuedAt) ?? booking?.completed_at ?? booking?.created_at ?? new Date().toISOString(),
    booking_id: bookingId,
    customer: {
      name: text(raw?.customer?.name) ?? text(useAuthStore.getState().user?.name) ?? '',
      ...(address ? { address } : {}),
    },
    provider: {
      name: providerName,
      ...(category ? { category } : {}),
      ...(text(raw?.provider?.tax_id) ? { tax_id: text(raw.provider.tax_id)! } : {}),
    },
    line_items: lines,
    ...(category ? { category } : {}),
    ...(isCustomQuote ? { is_custom_quote: true } : {}),
    subtotal,
    platform_fee: platformFee,
    ...(fees.customer_fee_percent != null ? { platform_fee_percent: fees.customer_fee_percent } : {}),
    ...(taxAmount > 0 ? { tax_amount: taxAmount } : {}),
    ...(fees.tax_label ? { tax_label: fees.tax_label } : {}),
    ...(fees.tax_percent != null ? { tax_percent: fees.tax_percent } : {}),
    ...(discount > 0 ? { discount } : {}),
    total,
    currency: text(raw?.currency) ?? booking?.currency ?? 'PKR',
    payment_method: resolvePayment(payment, raw?.payment_method ?? raw?.paymentMethod, booking),
  };
  return invoice;
}
