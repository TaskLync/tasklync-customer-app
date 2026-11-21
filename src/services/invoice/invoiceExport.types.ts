import type { View } from 'react-native';
import type { InvoiceView } from '../../utils/invoiceView';

export type InvoiceExportFormat = 'pdf' | 'image';

/**
 * How the file reached the customer, so the UI can confirm it truthfully:
 *  - 'shared':       native save / share sheet was shown (Android / iOS)
 *  - 'downloaded':   the browser saved the file (web image)
 *  - 'print-dialog': the browser's print dialog was shown with the invoice only (web PDF: "Save as PDF")
 */
export type InvoiceExportOutcome = 'shared' | 'downloaded' | 'print-dialog';

export interface InvoiceExportOptions {
  /** Runs once the file is ready, before it is handed over (e.g. close the RN sheet first). */
  beforeDeliver?: () => void | Promise<void>;
  /**
   * 'save' (Download sheet) or 'share' (header Share icon). The file is identical; only the hand-over
   * differs: the sheet title on Android/iOS, and on web 'share' uses the Web Share API with the file.
   */
  intent?: 'save' | 'share';
}

export interface InvoiceExportEngine {
  exportPdf(view: InvoiceView, opts?: InvoiceExportOptions): Promise<InvoiceExportOutcome>;
  /**
   * `target` is the dedicated InvoiceDocument (light theme, opaque white) mounted only for export,
   * never the screen, the header or a sheet.
   */
  exportImage(view: InvoiceView, target: View | null, opts?: InvoiceExportOptions): Promise<InvoiceExportOutcome>;
}

/** A failure with a message safe to show customers; `cause` keeps the technical error for logs. */
export class InvoiceExportError extends Error {
  readonly cause: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'InvoiceExportError';
    this.cause = cause;
  }
}
