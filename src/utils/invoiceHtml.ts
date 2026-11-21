/**
 * Print-ready HTML for the invoice PDF (A4). Built from the same InvoiceView as the screen, so the
 * PDF and the app can never disagree. System fonts only: bundled fonts do not load in the print
 * WebView on iOS. Long invoices flow onto more pages; the services table header repeats per page and
 * rows never split across a page break.
 */
import type { InvoiceView } from './invoiceView';

/** A4 in PDF points (72 per inch). */
export const A4 = { width: 595, height: 842 } as const;
/** Page margins in points; Android takes them from @page, iOS from printToFileAsync's `margins`. */
export const PDF_MARGINS = { top: 40, bottom: 40, left: 44, right: 44 } as const;

const esc = (v: string | null | undefined): string =>
  (v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STATUS_STYLE: Record<InvoiceView['status'], string> = {
  PAID: 'color:#15803D;background:#DCFCE7;',
  PENDING: 'color:#B45309;background:#FEF3C7;',
  REFUNDED: 'color:#475569;background:#F1F5F9;',
};

export interface InvoiceHtmlOptions {
  /**
   * 'device': expo-print on Android / iOS (page margins via @page / print options).
   * 'browser': printed from a web iframe. The @page margin is 0 so the browser has no margin box to
   * draw its own header / footer (URL, date, page x of y) into; the document's margins come from a
   * wrapper table whose header / footer spacer rows repeat on every printed page.
   */
  target?: 'device' | 'browser';
  /** Document title (browsers use it as the default "Save as PDF" file name). */
  title?: string;
}

export function buildInvoiceHtml(v: InvoiceView, opts: InvoiceHtmlOptions = {}): string {
  const browser = opts.target === 'browser';
  const title = opts.title ?? `TaskLync Invoice ${v.invoiceNumber}`;
  const party = (label: string, lines: (string | null)[], strongFirst = true) => {
    const [first, ...rest] = lines.filter((l): l is string => Boolean(l));
    return `<div class="party">
      <div class="label">${esc(label)}</div>
      ${first ? `<div class="${strongFirst ? 'strong' : 'muted'}">${esc(first)}</div>` : ''}
      ${rest.map((l) => `<div class="muted">${esc(l)}</div>`).join('')}
    </div>`;
  };

  const lineRows = v.lines
    .map(
      (l) => `<tr>
        <td class="desc">${esc(l.name)}${l.detail ? `<div class="sub num">${esc(l.detail)}</div>` : ''}</td>
        <td class="amt num">${esc(l.amount)}</td>
      </tr>`,
    )
    .join('');

  const summaryRows = v.summary
    .map(
      (r) => `<tr><td>${esc(r.label)}</td><td class="amt num${r.kind === 'discount' ? ' good' : ''}">${esc(r.value)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  ${browser
    ? `@page { size: A4; margin: 0; }
  .page-frame { width: 100%; border-collapse: collapse; }
  .page-frame > thead > tr > td, .page-frame > tfoot > tr > td { height: 14mm; padding: 0; }
  .page-frame > tbody > tr > td { padding: 0 16mm; }
  .page-frame > thead { display: table-header-group; }
  .page-frame > tfoot { display: table-footer-group; }
  html, body { background: #FFFFFF; }`
    : `@page { size: A4; margin: ${PDF_MARGINS.top}px ${PDF_MARGINS.right}px ${PDF_MARGINS.bottom}px ${PDF_MARGINS.left}px; }`}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0F172A; font-size: 11pt; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .num { font-variant-numeric: tabular-nums; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { color: #16A34A; font-weight: 600; font-size: 12pt; letter-spacing: -0.1px; }
  h1 { margin: 2px 0 0; font-size: 20pt; font-weight: 600; letter-spacing: -0.3px; }
  .status { display: inline-block; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.6px; padding: 3px 8px; border-radius: 4px; }
  .meta { display: flex; justify-content: space-between; margin-top: 18px; }
  .meta .right { text-align: right; }
  .label { color: #94A3B8; font-size: 9pt; font-weight: 500; margin-bottom: 3px; }
  .value { font-weight: 500; }
  hr { border: 0; border-top: 0.75px solid #E2E8F0; margin: 18px 0; }
  .parties { display: flex; gap: 32px; }
  .party { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .strong { font-weight: 600; }
  .muted { color: #475569; font-size: 10pt; margin-top: 1px; }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; }
  .tag { color: #475569; font-size: 9pt; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th { text-align: left; color: #94A3B8; font-size: 9pt; font-weight: 500; padding: 0 0 6px; border-bottom: 0.75px solid #E2E8F0; }
  th.amt { text-align: right; }
  .items td { padding: 9px 0; vertical-align: top; border-bottom: 0.75px solid #F1F5F9; }
  .items td.desc { padding-right: 24px; overflow-wrap: anywhere; }
  .sub { color: #94A3B8; font-size: 9.5pt; margin-top: 1px; }
  td.amt { text-align: right; white-space: nowrap; }
  .totals { width: 55%; margin: 14px 0 0 auto; page-break-inside: avoid; break-inside: avoid; }
  .totals td { padding: 3px 0; color: #475569; }
  .totals td.amt { color: #0F172A; }
  .good { color: #15803D !important; }
  .totals tr:nth-last-child(2) td { padding-bottom: 9px; }
  .grand td { padding-top: 10px; border-top: 0.75px solid #E2E8F0; color: #0F172A; font-weight: 600; }
  .grand td.amt { font-size: 16pt; letter-spacing: -0.2px; }
  .payment { page-break-inside: avoid; break-inside: avoid; }
  .foot { margin-top: 28px; color: #94A3B8; font-size: 8.5pt; }
</style>
</head>
<body>
${browser ? '<table class="page-frame"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td>' : ''}
  <div class="head">
    <div>
      <div class="brand">TaskLync</div>
      <h1>Service Invoice</h1>
    </div>
    <span class="status" style="${STATUS_STYLE[v.status]}">${esc(v.statusLabel.toUpperCase())}</span>
  </div>

  <div class="meta">
    <div><div class="label">Invoice no.</div><div class="value num">${esc(v.invoiceNumber)}</div></div>
    <div class="right"><div class="label">Issue date</div><div class="value num">${esc(v.issuedDate)}</div></div>
  </div>

  <hr />

  <div class="parties">
    ${party('Billed to', [v.customerName, v.customerAddress], Boolean(v.customerName))}
    ${party('Service provider', [v.providerName, v.providerCategory, v.providerTaxId ? `Tax ID ${v.providerTaxId}` : null], Boolean(v.providerName))}
  </div>

  <hr />

  <div class="section-head" style="margin-bottom:8px">
    <div class="label">${v.isCustomQuote ? 'Custom service' : 'Services'}</div>
    ${v.serviceCategory ? `<div class="tag">${esc(v.serviceCategory)}</div>` : ''}
  </div>
  <table class="items">
    <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>

  <table class="totals">
    <tbody>
      ${summaryRows}
      <tr class="grand"><td>${esc(v.totalLabel)}</td><td class="amt num">${esc(v.total)}</td></tr>
    </tbody>
  </table>

  <hr />

  <div class="payment">
    <div class="label">Payment method</div>
    <div class="strong">${esc(v.paymentMethod)}</div>
    ${v.paymentNote ? `<div class="muted">${esc(v.paymentNote)}</div>` : ''}
    ${v.paymentReference ? `<div class="muted num">Ref. ${esc(v.paymentReference)}</div>` : ''}
  </div>

  <div class="foot">TaskLync · Invoice ${esc(v.invoiceNumber)}</div>
${browser ? '</td></tr></tbody></table>' : ''}
</body>
</html>`;
}
