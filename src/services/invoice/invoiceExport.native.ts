/**
 * Invoice export on Android / iOS.
 *   PDF:   the invoice HTML -> expo-print (a real A4 PDF from a document, not a screen capture)
 *   Image: react-native-view-shot of the dedicated InvoiceDocument view (full height, light, opaque)
 * The file is given the invoice's name in the cache directory, temporary outputs are deleted, and the
 * native sheet lets the customer save (Files / Downloads / Photos) or share it.
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { A4, PDF_MARGINS, buildInvoiceHtml } from '../../utils/invoiceHtml';
import { invoiceFileBase, type InvoiceView } from '../../utils/invoiceView';
import {
  InvoiceExportError,
  type InvoiceExportEngine,
  type InvoiceExportFormat,
  type InvoiceExportOptions,
} from './invoiceExport.types';

const MIME: Record<InvoiceExportFormat, { mimeType: string; UTI: string; title: string }> = {
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', title: 'Save or share invoice PDF' },
  image: { mimeType: 'image/png', UTI: 'public.png', title: 'Save or share invoice image' },
};

/**
 * Copies a generated temp file to `<cache>/<name>` so the saved / shared file carries the invoice name,
 * then removes the temp file. Same name each time: a repeated download replaces the previous copy.
 */
async function toNamedCacheFile(sourceUri: string, name: string): Promise<string> {
  const source = new File(sourceUri);
  const dest = new File(Paths.cache, name);
  if (dest.exists) dest.delete();
  await source.copy(dest);
  try {
    source.delete();
  } catch {
    // temp file already gone: nothing to clean
  }
  return dest.uri;
}

async function deliver(uri: string, format: InvoiceExportFormat, opts?: InvoiceExportOptions) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new InvoiceExportError("Saving files isn't available on this device.");
  }
  // iOS cannot present the share sheet over an open RN Modal: the caller closes its sheet and resolves
  // once it is gone; one more frame lets the view controller finish dismissing.
  if (opts?.beforeDeliver) {
    await opts.beforeDeliver();
    if (Platform.OS === 'ios') await new Promise((r) => setTimeout(r, 120));
  }
  const m = MIME[format];
  // The file itself is the payload (no text, no URL), so chat apps receive it as an attachment.
  // shareAsync resolves when the sheet closes, whether the customer shared or cancelled.
  await Sharing.shareAsync(uri, {
    mimeType: m.mimeType,
    UTI: m.UTI,
    dialogTitle: opts?.intent === 'share' ? 'Share invoice' : m.title,
  });
}

export const invoiceExportEngine: InvoiceExportEngine = {
  async exportPdf(view: InvoiceView, opts?: InvoiceExportOptions) {
    let uri: string;
    try {
      const printed = await Print.printToFileAsync({
        html: buildInvoiceHtml(view, { target: 'device' }),
        width: A4.width,
        height: A4.height,
        // Android reads margins from the HTML's @page rule; iOS needs them here.
        ...(Platform.OS === 'ios' ? { margins: { ...PDF_MARGINS } } : {}),
      });
      uri = await toNamedCacheFile(printed.uri, `${invoiceFileBase(view.invoiceNumber)}.pdf`);
    } catch (e) {
      throw new InvoiceExportError("Couldn't create the PDF. Please try again.", e);
    }
    await deliver(uri, 'pdf', opts);
    return 'shared';
  },

  async exportImage(view: InvoiceView, target, opts?: InvoiceExportOptions) {
    if (!target) throw new InvoiceExportError("The invoice isn't ready yet. Please try again.");
    let uri: string;
    let tmp: string | null = null;
    try {
      // Captures the export document view itself (its full laid-out height), not the screen.
      tmp = await captureRef(target, { format: 'png', quality: 1, result: 'tmpfile' });
      uri = await toNamedCacheFile(tmp, `${invoiceFileBase(view.invoiceNumber)}.png`);
      tmp = null; // moved into the named file
    } catch (e) {
      throw new InvoiceExportError("Couldn't create the image. Please try again.", e);
    } finally {
      if (tmp) releaseCapture(tmp);
    }
    await deliver(uri, 'image', opts);
    return 'shared';
  },
};
