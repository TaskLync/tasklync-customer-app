/**
 * Invoice export in the browser.
 *
 * Why this file exists: on web, expo-print's printToFileAsync() ignores the HTML and calls
 * window.print() on the whole app page (header, open bottom sheet, dimmed backdrop, browser URL/date
 * headers), and expo-file-system's File is an unimplemented stub (`this.validatePath is not a function`).
 *
 *   PDF:   the invoice HTML is printed from an isolated, off-screen iframe that contains nothing else.
 *          @page margin 0 leaves the browser no room for its own header/footer; the document draws its
 *          own margins. The customer picks "Save as PDF" (the browser's way to save a PDF).
 *   Image: html2canvas renders only the dedicated InvoiceDocument element (light, opaque white) at 3x,
 *          full height, and the browser downloads it as a .png.
 */
import html2canvas from 'html2canvas';
import { buildInvoiceHtml } from '../../utils/invoiceHtml';
import { invoiceFileBase, type InvoiceView } from '../../utils/invoiceView';
import { InvoiceExportError, type InvoiceExportEngine, type InvoiceExportOptions } from './invoiceExport.types';

/** Browsers cap canvas side length (~16k px in Chrome/Safari); stay safely below it for long invoices. */
const MAX_CANVAS_SIDE = 15000;
const IMAGE_SCALE = 3;

function printHtmlInIsolatedFrame(html: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');
    // Off-screen but rendered (display:none / visibility:hidden frames print blank in some browsers).
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
    });

    const previousTitle = document.title;
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      document.title = previousTitle;
      // Removing the frame while the dialog is still open would cancel it in some browsers.
      setTimeout(() => iframe.remove(), 1000);
    };

    iframe.onload = async () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) throw new Error('print frame has no document');
        await (doc as any).fonts?.ready;
        // Chrome / Edge name the "Save as PDF" file after the printed document's title.
        document.title = title;
        win.addEventListener('afterprint', cleanup, { once: true });
        win.focus();
        // Safari prints the parent page for contentWindow.print() on a frame; execCommand targets the frame.
        const handled = (() => {
          try {
            return doc.execCommand('print', false);
          } catch {
            return false;
          }
        })();
        if (!handled) win.print();
        // print() blocks until the dialog closes in Chromium / Firefox; Safari returns at once and fires afterprint.
        setTimeout(cleanup, 60_000);
        resolve();
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before the object URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const invoiceExportEngine: InvoiceExportEngine = {
  async exportPdf(view: InvoiceView, opts?: InvoiceExportOptions) {
    const title = invoiceFileBase(view.invoiceNumber);
    const html = buildInvoiceHtml(view, { target: 'browser', title });
    await opts?.beforeDeliver?.();
    try {
      await printHtmlInIsolatedFrame(html, title);
    } catch (e) {
      throw new InvoiceExportError("Couldn't open the PDF. Please try again.", e);
    }
    return 'print-dialog';
  },

  async exportImage(view: InvoiceView, target, opts?: InvoiceExportOptions) {
    // On react-native-web a View ref is its DOM element.
    const el = target as unknown as HTMLElement | null;
    if (!el || typeof (el as any).getBoundingClientRect !== 'function') {
      throw new InvoiceExportError("The invoice isn't ready yet. Please try again.");
    }

    let blob: Blob | null;
    try {
      await (document as any).fonts?.ready;
      const width = Math.ceil(el.scrollWidth);
      const height = Math.ceil(el.scrollHeight);
      const scale = Math.max(1, Math.min(IMAGE_SCALE, MAX_CANVAS_SIDE / Math.max(width, height)));
      const canvas = await html2canvas(el, {
        scale,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        width,
        height,
        // Render the whole element even when it is taller than the browser window.
        windowWidth: Math.max(width, document.documentElement.clientWidth),
        windowHeight: Math.max(height, document.documentElement.clientHeight),
        scrollX: 0,
        scrollY: -window.scrollY,
      });
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      canvas.width = 0; // release the bitmap memory now
      canvas.height = 0;
    } catch (e) {
      throw new InvoiceExportError("Couldn't create the image. Please try again.", e);
    }
    if (!blob) throw new InvoiceExportError("Couldn't create the image. Please try again.");

    await opts?.beforeDeliver?.();
    const fileName = `${invoiceFileBase(view.invoiceNumber)}.png`;

    if (opts?.intent === 'share') {
      // Share the PNG itself where the browser can share files (mobile Chrome / Safari); no text, no URL.
      const file = new File([blob], fileName, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file] });
        } catch (e: any) {
          // The customer closed the share sheet: not an error.
          if (e?.name !== 'AbortError') throw new InvoiceExportError("Couldn't share the image. Please try again.", e);
        }
        return 'shared';
      }
      // Desktop browsers cannot share files: save it so it can be attached manually.
    }

    downloadBlob(blob, fileName);
    return 'downloaded';
  },
};
