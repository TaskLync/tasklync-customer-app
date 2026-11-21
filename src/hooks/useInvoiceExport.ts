import { useCallback, useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import { invoiceExportEngine } from '../services/invoice/invoiceExport';
import {
  InvoiceExportError,
  type InvoiceExportFormat,
  type InvoiceExportOptions,
  type InvoiceExportOutcome,
} from '../services/invoice/invoiceExport.types';
import type { InvoiceView } from '../utils/invoiceView';

export type { InvoiceExportFormat, InvoiceExportOutcome };

export type InvoiceExportState =
  | { status: 'idle' }
  | { status: 'working'; format: InvoiceExportFormat }
  | { status: 'done'; format: InvoiceExportFormat; outcome: InvoiceExportOutcome }
  | { status: 'error'; format: InvoiceExportFormat; message: string };

const fallbackMessage = (format: InvoiceExportFormat) =>
  `Couldn't create the ${format === 'pdf' ? 'PDF' : 'image'}. Please try again.`;

/**
 * UI state around the platform export engine (services/invoice/invoiceExport*.ts).
 * One export at a time; customers only ever see plain messages, the technical error goes to the log.
 */
export function useInvoiceExport() {
  const [state, setState] = useState<InvoiceExportState>({ status: 'idle' });
  const busy = useRef(false);

  const run = useCallback(async (format: InvoiceExportFormat, task: () => Promise<InvoiceExportOutcome>) => {
    if (busy.current) return null;
    busy.current = true;
    setState({ status: 'working', format });
    try {
      const outcome = await task();
      setState({ status: 'done', format, outcome });
      return outcome;
    } catch (e) {
      const known = e instanceof InvoiceExportError;
      console.error(`[invoice-export] ${format} failed`, known ? (e as InvoiceExportError).cause ?? e : e);
      setState({ status: 'error', format, message: known ? (e as Error).message : fallbackMessage(format) });
      return null;
    } finally {
      busy.current = false;
    }
  }, []);

  const exportPdf = useCallback(
    (view: InvoiceView, opts?: InvoiceExportOptions) => run('pdf', () => invoiceExportEngine.exportPdf(view, opts)),
    [run],
  );

  const exportImage = useCallback(
    (view: InvoiceView, ref: RefObject<View | null>, opts?: InvoiceExportOptions) =>
      run('image', () => invoiceExportEngine.exportImage(view, ref.current, opts)),
    [run],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, exportPdf, exportImage, reset };
}
