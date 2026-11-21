import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Share, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon, DownloadIcon, ShareIcon } from '../../../src/components/ui/Icon/icons';

import { useInvoice } from '../../../src/hooks/useInvoice';
import { useInvoiceExport, type InvoiceExportFormat } from '../../../src/hooks/useInvoiceExport';
import { InvoiceDocument } from '../../../src/components/invoice/InvoiceDocument';
import { InvoiceDownloadSheet } from '../../../src/components/invoice/InvoiceDownloadSheet';
import { buildInvoiceView, invoiceFileBase } from '../../../src/utils/invoiceView';
import { showAlert } from '../../../src/components/feedback/AppAlert';
import { fontFamily, radius, spacing } from '../../../src/design';
import { lightTheme } from '../../../src/design/themes';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../../src/theme/ThemedStatusBar';

/** Width of the off-screen document used for the image export (logical px; output is × device density). */
const IMAGE_EXPORT_WIDTH = 420;

export default function InvoiceScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();

  const { invoice, isLoading, isError, error, refetch } = useInvoice(bookingId);
  const view = useMemo(() => (invoice?.kind === 'structured' ? buildInvoiceView(invoice) : null), [invoice]);

  const captureRef = useRef<View>(null);
  const { state: exportState, exportPdf, exportImage, reset } = useInvoiceExport();
  const [sheetOpen, setSheetOpen] = useState(false);

  const openDownload = useCallback(async () => {
    if (!invoice) return;
    if (invoice.kind === 'pdf') {
      // The server already issued the PDF: open it (the system viewer offers save / share).
      try {
        await Linking.openURL(invoice.url);
      } catch {
        showAlert("Couldn't open the PDF", 'Please try again.');
      }
      return;
    }
    reset();
    setSheetOpen(true);
  }, [invoice, reset]);

  // The native share sheet must open only after our sheet's Modal is gone (iOS cannot present over it).
  // BottomSheet reports that through onClose, after its close animation; this turns it into a promise.
  const closedWaiter = useRef<(() => void) | null>(null);
  const handleSheetClosed = useCallback(() => {
    setSheetOpen(false);
    closedWaiter.current?.();
    closedWaiter.current = null;
  }, []);
  const closeSheetAndWait = useCallback(
    () =>
      new Promise<void>((resolve) => {
        closedWaiter.current = resolve;
        setSheetOpen(false);
        // Safety net: never leave the export waiting if the close callback does not arrive.
        setTimeout(resolve, 1200);
      }),
    [],
  );

  const onSelectFormat = useCallback(
    (format: InvoiceExportFormat) => {
      if (!view) return;
      const opts = { beforeDeliver: closeSheetAndWait };
      if (format === 'pdf') exportPdf(view, opts);
      else exportImage(view, captureRef, opts);
    },
    [view, exportPdf, exportImage, closeSheetAndWait],
  );

  // Failures after the sheet has closed (e.g. the native share sheet is unavailable) need their own message.
  useEffect(() => {
    if (exportState.status === 'error' && !sheetOpen) {
      showAlert("Couldn't save the invoice", exportState.message);
      reset();
    } else if (exportState.status === 'done') {
      // A browser download has no system confirmation of its own; the native share sheet does.
      if (exportState.outcome === 'downloaded' && view) {
        showAlert('Invoice saved', `${invoiceFileBase(view.invoiceNumber)}.png has been downloaded.`, undefined, {
          type: 'success',
        });
      }
      reset();
    }
  }, [exportState, sheetOpen, reset, view]);

  // Share = the invoice image itself (same generator as Download → Image), handed to the system share
  // sheet as a PNG file, so WhatsApp / Telegram / Gmail receive an image attachment, not text or a link.
  const handleShare = useCallback(async () => {
    if (!invoice) return;
    if (invoice.kind === 'structured') {
      if (view) exportImage(view, captureRef, { intent: 'share' });
      return;
    }
    // Server-issued PDF invoice: there is no invoice data to draw an image from, only the signed file.
    try {
      await Share.share({ title: `Invoice ${invoice.invoice_number}`, message: invoice.url, url: invoice.url });
    } catch {
      // dismissed
    }
  }, [invoice, view, exportImage]);

  // Spinner on the Share icon while it prepares the image (the Download sheet shows its own progress).
  const sharing = exportState.status === 'working' && !sheetOpen;
  const actionsEnabled = Boolean(invoice) && !isLoading && exportState.status !== 'working';

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <ThemedStatusBar />

      {/* Header: back · centred title · download, share */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon size={22} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
          Invoice & Receipt
        </Text>

        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={openDownload}
            disabled={!actionsEnabled}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Download invoice"
            accessibilityState={{ disabled: !actionsEnabled }}
          >
            <DownloadIcon size={21} color={actionsEnabled ? colors.textPrimary : colors.textDisabled} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={handleShare}
            disabled={!actionsEnabled}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={sharing ? 'Preparing invoice image' : 'Share invoice as image'}
            accessibilityState={{ disabled: !actionsEnabled, busy: sharing }}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <ShareIcon size={20} color={actionsEnabled ? colors.textPrimary : colors.textDisabled} />
            )}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.loadingText}>Loading invoice…</Text>
        </View>
      ) : isError || !invoice ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>Couldn't load invoice</Text>
          <Text style={styles.errorSubtitle}>{error || 'Please check your connection and try again.'}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            onPress={() => refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Image export source: the same document, always light, laid out behind the scroll view. */}
          {view ? (
            <View
              style={styles.captureHost}
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            >
              <View ref={captureRef} collapsable={false} style={{ width: IMAGE_EXPORT_WIDTH }}>
                <InvoiceDocument view={view} theme={lightTheme} style={styles.captureDoc} />
              </View>
            </View>
          ) : null}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
            showsVerticalScrollIndicator={false}
          >
            {view ? (
              <InvoiceDocument view={view} theme={theme} />
            ) : invoice.kind === 'pdf' ? (
              <View style={styles.pdfBlock}>
                <Text style={styles.pdfLabel}>Invoice no.</Text>
                <Text style={styles.pdfNumber} selectable>{invoice.invoice_number}</Text>
                <Pressable
                  style={({ pressed }) => [styles.retryButton, styles.pdfButton, pressed && styles.pressed]}
                  onPress={openDownload}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryButtonText}>Open PDF invoice</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </>
      )}

      <InvoiceDownloadSheet visible={sheetOpen} state={exportState} onSelect={onSelectFormat} onClosed={handleSheetClosed} />
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgCard,
    },
    header: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.bgCard,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 1,
    },
    headerTitle: {
      // Centred on the screen, not between the uneven side groups.
      position: 'absolute',
      left: 96,
      right: 96,
      textAlign: 'center',
      fontFamily: fontFamily.poppins.semiBold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.55,
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    loadingText: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    errorTitle: {
      fontFamily: fontFamily.poppins.semiBold,
      fontSize: 17,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    errorSubtitle: {
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.buttonPrimary,
      borderRadius: radius.pill,
    },
    retryButtonText: {
      fontFamily: fontFamily.poppins.semiBold,
      fontSize: 14,
      color: colors.buttonPrimaryText,
    },
    // Opaque so the capture host behind it never shows through.
    scrollView: {
      flex: 1,
      backgroundColor: colors.bgCard,
    },
    captureHost: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: -1,
    },
    captureDoc: {
      paddingHorizontal: 28,
      paddingVertical: 32,
    },
    pdfBlock: {
      padding: 20,
    },
    pdfLabel: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 12,
      color: colors.textMuted,
    },
    pdfNumber: {
      fontFamily: fontFamily.inter.medium,
      fontSize: 15,
      color: colors.textPrimary,
      marginTop: 4,
    },
    pdfButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.lg,
    },
  });
