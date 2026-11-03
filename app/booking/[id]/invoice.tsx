import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, FileText, Download, ExternalLink, ShieldCheck } from 'lucide-react-native';

import { useInvoice } from '../../../src/hooks/useInvoice';
import { InvoiceHeader } from '../../../src/components/booking/InvoiceHeader';
import { InvoiceLineItem } from '../../../src/components/booking/InvoiceLineItem';
import { InvoiceFeeBreakdown } from '../../../src/components/booking/InvoiceFeeBreakdown';
import { PaymentMethodRow } from '../../../src/components/booking/PaymentMethodRow';
import {
  colors,
  palette,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from '../../../src/design';

/**
 * InvoiceScreen (Day 34 Post-Booking Financial Receipt)
 *
 * Implements Principal-level React Native & UX Architecture:
 * - Handles both Structured JSON and Signed PDF URL responses via discriminated union
 * - Official document aesthetic with Aesthetic-Usability polish
 * - Native OS Share sheet integration (Jakob's Law)
 * - Serial Position preservation for itemized service charges
 */
export default function InvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();

  const { invoice, isLoading, isError, error, refetch } = useInvoice(bookingId);

  // Native Share Handler
  const handleShare = useCallback(async () => {
    if (!invoice) return;

    try {

      if (invoice.kind === 'pdf') {
        await Share.share({
          title: `Invoice ${invoice.invoice_number}`,
          message: `Tasklync Invoice ${invoice.invoice_number}: ${invoice.url}`,
          url: Platform.OS === 'ios' ? invoice.url : undefined,
        });
      } else {
        const lineSummary = invoice.line_items
          .map((i) => `• ${i.name} (Qty: ${i.quantity}): ${invoice.currency} ${i.total_price.toLocaleString()}`)
          .join('\n');

        const message = `🧾 TASKLYNC OFFICIAL RECEIPT\nInvoice No: ${invoice.invoice_number}\nDate: ${new Date(invoice.issued_at).toLocaleDateString()}\n\nBilled To: ${invoice.customer.name}\nService By: ${invoice.provider.name}\n\nItemized Services:\n${lineSummary}\n\nTotal Paid: ${invoice.currency} ${invoice.total.toLocaleString()}\nPayment Status: ${invoice.payment_method.status}\n\nTasklync Escrow Protection Guarantee`;

        await Share.share({
          title: `Receipt ${invoice.invoice_number}`,
          message,
        });
      }
    } catch (_err) {
      // Share dismissed
    }
  }, [invoice]);

  const handleOpenPdfUrl = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (_e) {
      // Fallback
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* Screen Navigation Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>Invoice & Receipt</Text>

        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
          onPress={handleShare}
          disabled={!invoice || isLoading}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Share invoice"
        >
          <Share2 size={20} color={invoice ? colors.textPrimary : palette.gray300} />
        </Pressable>
      </View>

      {/* Content Area */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Generating secure invoice...</Text>
        </View>
      ) : isError || !invoice ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>Unable to load invoice</Text>
          <Text style={styles.errorSubtitle}>
            {error || 'We could not fetch the receipt for this booking.'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Branch 1: Signed PDF Document */}
          {invoice.kind === 'pdf' ? (
            <View style={styles.receiptCard}>
              <View style={styles.pdfBadgeRow}>
                <View style={styles.pdfIconCircle}>
                  <FileText size={32} color={colors.primaryDark} />
                </View>
                <View style={styles.pdfMetaCol}>
                  <Text style={styles.pdfTitle}>Official Tax Invoice PDF</Text>
                  <Text style={styles.pdfNumber}>{invoice.invoice_number}</Text>
                </View>
              </View>

              <Text style={styles.pdfDesc}>
                This booking was settled with a signed digital PDF invoice certificate. You can view or download it directly.
              </Text>

              <Pressable
                style={({ pressed }) => [styles.pdfActionBtn, pressed && styles.buttonPressed]}
                onPress={() => handleOpenPdfUrl(invoice.url)}
              >
                <Download size={18} color={colors.textOnGreen} />
                <Text style={styles.pdfActionText}>Download PDF Invoice</Text>
                <ExternalLink size={16} color={colors.textOnGreen} style={styles.externalIcon} />
              </Pressable>
            </View>
          ) : (
            /* Branch 2: Structured Document */
            <View style={styles.receiptCard}>
              {/* Document Header */}
              <InvoiceHeader
                invoiceNumber={invoice.invoice_number}
                issuedAt={invoice.issued_at}
                status={invoice.payment_method.status}
              />

              {/* Provider & Customer Party Info */}
              <View style={styles.partiesContainer}>
                {/* Billed To */}
                <View style={styles.partyCol}>
                  <Text style={styles.partyHeading}>BILLED TO</Text>
                  <Text style={styles.partyName}>{invoice.customer.name}</Text>
                  {invoice.customer.address ? (
                    <Text style={styles.partyAddress} numberOfLines={2}>
                      {invoice.customer.address}
                    </Text>
                  ) : null}
                  {invoice.customer.phone ? (
                    <Text style={styles.partyPhone}>{invoice.customer.phone}</Text>
                  ) : null}
                </View>

                {/* Service Provider */}
                <View style={[styles.partyCol, styles.partyColRight]}>
                  <Text style={styles.partyHeading}>SERVICE PROVIDER</Text>
                  <Text style={styles.partyName}>{invoice.provider.name}</Text>
                  {invoice.provider.category ? (
                    <Text style={styles.partyAddress}>{invoice.provider.category}</Text>
                  ) : null}
                  {invoice.provider.tax_id ? (
                    <Text style={styles.partyTax}>Tax ID: {invoice.provider.tax_id}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.sectionDivider} />

              {/* Line Items List */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionHeading}>ITEMIZED CHARGES</Text>
                {invoice.line_items.map((item) => (
                  <InvoiceLineItem
                    key={item.id}
                    item={item}
                    currency={invoice.currency}
                  />
                ))}
              </View>

              {/* Fee Breakdown & Dominant Total */}
              <InvoiceFeeBreakdown
                subtotal={invoice.subtotal}
                platformFee={invoice.platform_fee}
                urgencyFee={invoice.urgency_fee}
                discount={invoice.discount}
                total={invoice.total}
                currency={invoice.currency}
              />

              {/* Payment Method Row */}
              <PaymentMethodRow
                paymentMethod={invoice.payment_method}
                paidAt={invoice.payment_method.paid_at}
              />

              {/* Escrow Guarantee Security Footer */}
              <View style={styles.guaranteeBox}>
                <ShieldCheck size={18} color={colors.primaryDark} />
                <Text style={styles.guaranteeText}>
                  Verified Escrow Payment · Protected by Tasklync Customer Guarantee
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgApp,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4 + 1,
    color: colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  retryButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2,
    color: colors.textOnGreen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  receiptCard: {
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  partiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  partyCol: {
    flex: 1,
  },
  partyColRight: {
    alignItems: 'flex-end',
  },
  partyHeading: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: fontSize.nano + 0.5,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2 + 0.5,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  partyAddress: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  partyPhone: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.dataXS,
    color: colors.textMuted,
    marginTop: 2,
  },
  partyTax: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.dataXS,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  itemsSection: {
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: fontSize.nano + 0.5,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.green50,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  guaranteeText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.nano + 1,
    color: colors.primaryDark,
    textAlign: 'center',
    flexShrink: 1,
  },
  pdfBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  pdfIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.green200,
  },
  pdfMetaCol: {
    flex: 1,
  },
  pdfTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: colors.textPrimary,
  },
  pdfNumber: {
    fontFamily: fontFamily.inter.medium,
    fontSize: fontSize.dataSM,
    color: colors.textMuted,
  },
  pdfDesc: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  pdfActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radius.pill,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  pdfActionText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2 + 1,
    color: colors.textOnGreen,
  },
  externalIcon: {
    marginLeft: 4,
  },
});
