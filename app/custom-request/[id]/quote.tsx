import { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeftIcon,
  CashIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CloseCircleIcon,
  DocumentIcon,
  InfoIcon,
} from '../../../src/components/ui/Icon/icons';

import { useCustomRequestDetail } from '../../../src/hooks/custom-requests/useCustomRequestDetail';
import { useQuoteDetail } from '../../../src/hooks/custom-requests/useQuoteDetail';
import { QuoteBreakdownCard } from '../../../src/components/custom-requests/QuoteBreakdownCard';
import { QuoteExpiryCountdown } from '../../../src/components/custom-requests/QuoteExpiryCountdown';
import { DeclineQuoteModal } from '../../../src/components/custom-requests/DeclineQuoteModal';
import { QuotePricingType, QuoteStatus } from '../../../src/types/customRequest.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';
import { AppDialog } from '../../../src/components/feedback/AppDialog';

/** "Approximately 1 hour", "Approximately 2.5 hours", "Approximately 45 minutes"; null when unknown. */
function formatDuration(hours: number | null | undefined): string | null {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return null;
  if (h < 1) return `Approximately ${Math.round(h * 60)} minutes`;
  const rounded = Math.round(h * 10) / 10;
  return `Approximately ${rounded} ${rounded === 1 ? 'hour' : 'hours'}`;
}

/** A scope that is empty or looks like an internal id (uuid / hex) is not shown as the scope. */
function isReadableScope(text: string | null | undefined): text is string {
  const t = (text ?? '').trim();
  if (t.length < 3) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return false;
  if (/^[0-9a-f]{16,}$/i.test(t)) return false;
  return true;
}

/**
 * Review quote: built around the customer's decision order:
 * whose quote, its status, what is included, what it costs, how to pay, what to do next.
 * Every price, status and detail comes from the backend quote; the screen never decides acceptance itself.
 */
export default function QuoteReviewScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = id || '';

  const { request, isLoading: isRequestLoading } = useCustomRequestDetail(requestId);
  const {
    activeQuote,
    revisions,
    isLoading: isQuoteLoading,
    acceptQuote,
    isAccepting,
    rejectQuote,
    isRejecting,
  } = useQuoteDetail(requestId);

  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [acceptConfirmVisible, setAcceptConfirmVisible] = useState(false);
  const navigating = useRef(false);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/custom-request/${requestId}` as any);
  };

  const handleConfirmAccept = () => {
    setAcceptConfirmVisible(false);
    if (activeQuote) acceptQuote(activeQuote.id);
  };

  const handleConfirmDecline = (reason: string) => {
    setDeclineModalVisible(false);
    if (activeQuote) rejectQuote({ quoteId: activeQuote.id, reason });
  };

  // One tap = one navigation, even on a fast double tap.
  const handleContinue = () => {
    if (navigating.current) return;
    navigating.current = true;
    router.push(`/custom-request/${requestId}/checkout` as any);
    setTimeout(() => {
      navigating.current = false;
    }, 800);
  };

  const isLoading = isRequestLoading || isQuoteLoading;

  if (isLoading && !activeQuote) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
        <Text style={styles.loadingText}>Loading quote…</Text>
      </SafeAreaView>
    );
  }

  if (!activeQuote) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <DocumentIcon size={40} color={colors.textMuted} strokeWidth={1.6} />
        <Text style={styles.errorTitle}>No quote yet</Text>
        <Text style={styles.errorSubtitle}>The worker has not sent a quote yet, or it was withdrawn.</Text>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, styles.centerBtn, pressed && styles.secondaryBtnPressed]}
          onPress={handleBack}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryBtnText}>Go to request</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isFixed = activeQuote.quote_type === QuotePricingType.FIXED_QUOTE;
  const isSent = activeQuote.status === QuoteStatus.SENT;
  const isAccepted = activeQuote.status === QuoteStatus.ACCEPTED;
  const isRejected = activeQuote.status === QuoteStatus.REJECTED;
  const isWithdrawn = activeQuote.status === QuoteStatus.WITHDRAWN;
  const isExpired = activeQuote.status === QuoteStatus.EXPIRED;

  const workerName = request?.provider_name || request?.worker_name || null;
  const subtitle = [workerName ? `From ${workerName}` : null, activeQuote.version > 1 ? `Revision ${activeQuote.version}` : null]
    .filter(Boolean)
    .join(' · ');
  // The agreed scope is the quote's own scope; if it is unusable, show the customer's own request text instead.
  const scopeText = isReadableScope(activeQuote.scope_description)
    ? activeQuote.scope_description.trim()
    : isReadableScope(request?.description)
      ? request!.description.trim()
      : null;
  const duration = formatDuration(activeQuote.estimated_duration_hours);
  const terms = activeQuote.terms_and_exclusions || activeQuote.terms_and_conditions;
  const totalLabel = `${activeQuote.currency || 'PKR'} ${Math.round(Number(activeQuote.total_price || 0)).toLocaleString()}`;

  const status = isAccepted
    ? { icon: <CheckCircleIcon size={18} color={colors.primaryDark} strokeWidth={2} />, title: 'Quote accepted', text: 'Your price is confirmed. Continue to checkout.' }
    : isRejected
      ? { icon: <CloseCircleIcon size={18} color={colors.textDanger} strokeWidth={2} />, title: 'Quote declined', text: 'The worker has been told.' }
      : isWithdrawn
        ? { icon: <CloseCircleIcon size={18} color={colors.textSecondary} strokeWidth={2} />, title: 'Quote withdrawn', text: 'The worker withdrew this quote.' }
        : isExpired
          ? { icon: <ClockIcon size={18} color={colors.textSecondary} strokeWidth={2} />, title: 'Quote expired', text: 'Ask the worker for a new quote.' }
          : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Whose quote */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon size={22} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Review quote
          </Text>
          {subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 132 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Status (only what the backend says) */}
        {status ? (
          <View style={styles.statusRow} accessible accessibilityLabel={`${status.title}. ${status.text}`}>
            {status.icon}
            <View style={styles.statusTextCol}>
              <Text style={styles.statusTitle}>{status.title}</Text>
              <Text style={styles.statusText}>{status.text}</Text>
            </View>
          </View>
        ) : isSent && activeQuote.valid_until ? (
          <View style={styles.validityRow}>
            <QuoteExpiryCountdown validUntil={activeQuote.valid_until} />
          </View>
        ) : null}

        {/* 3. What's included */}
        <Text style={styles.sectionTitle}>What's included</Text>
        {scopeText ? (
          <Text style={styles.scopeText} selectable>
            {scopeText}
          </Text>
        ) : (
          <Text style={styles.mutedText}>The worker did not add a description.</Text>
        )}
        {duration ? (
          <View style={styles.durationRow}>
            <ClockIcon size={16} color={colors.textSecondary} strokeWidth={1.9} />
            <Text style={styles.durationLabel}>Estimated duration</Text>
            <Text style={styles.durationValue}>{duration}</Text>
          </View>
        ) : null}

        <View style={styles.sectionGap} />

        {/* 4. What it costs */}
        <QuoteBreakdownCard quote={activeQuote} />

        <View style={styles.noteRow}>
          <InfoIcon size={16} color={colors.textSecondary} strokeWidth={1.9} />
          <View style={styles.noteTextCol}>
            <Text style={styles.noteTitle}>{isFixed ? 'Fixed price' : 'Estimate'}</Text>
            <Text style={styles.noteText}>
              {isFixed
                ? 'The quoted price covers the agreed scope of work.'
                : 'The final price may change after the worker checks the job on site.'}
            </Text>
          </View>
        </View>

        {/* 5. How to pay */}
        <View style={styles.paymentRow}>
          <CashIcon size={20} color={colors.textSecondary} strokeWidth={1.8} />
          <View style={styles.noteTextCol}>
            <Text style={styles.paymentTitle}>Cash on Delivery</Text>
            <Text style={styles.noteText}>Pay after your service is completed.</Text>
          </View>
        </View>

        {terms ? (
          <>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Terms and exclusions</Text>
            <Text style={styles.bodyText}>{terms}</Text>
          </>
        ) : null}

        {revisions.length > 0 ? (
          <View style={styles.revisions}>
            <Pressable
              style={({ pressed }) => [styles.revisionsHeader, pressed && styles.rowPressed]}
              onPress={() => setShowRevisions((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showRevisions }}
            >
              <Text style={styles.revisionsTitle}>Earlier versions ({revisions.length})</Text>
              {showRevisions ? (
                <ChevronUpIcon size={18} color={colors.textMuted} />
              ) : (
                <ChevronDownIcon size={18} color={colors.textMuted} />
              )}
            </Pressable>
            {showRevisions
              ? revisions.map((rev) => (
                  <View key={rev.id || rev.version} style={styles.revisionItem}>
                    <View style={styles.revisionHead}>
                      <Text style={styles.revisionVersion}>Version {rev.version}</Text>
                      <Text style={styles.revisionPrice}>
                        {activeQuote.currency || 'PKR'} {Math.round(Number(rev.total_price)).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.mutedText} numberOfLines={2}>
                      {rev.scope_description}
                    </Text>
                    {rev.superseded_reason ? (
                      <Text style={styles.revisionReason}>Changed: {rev.superseded_reason}</Text>
                    ) : null}
                  </View>
                ))
              : null}
          </View>
        ) : null}
      </ScrollView>

      {/* 6. What to do next */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        {isSent ? (
          <View style={styles.footerRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, styles.flex1, pressed && styles.secondaryBtnPressed]}
              onPress={() => setDeclineModalVisible(true)}
              disabled={isAccepting || isRejecting}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>Decline</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                styles.flex2,
                pressed && styles.primaryBtnPressed,
                (isAccepting || isRejecting) && styles.btnDisabled,
              ]}
              onPress={() => setAcceptConfirmVisible(true)}
              disabled={isAccepting || isRejecting}
              accessibilityRole="button"
              accessibilityState={{ busy: isAccepting, disabled: isAccepting || isRejecting }}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={colors.pureWhite} />
              ) : (
                <Text style={styles.primaryBtnText}>Accept and book</Text>
              )}
            </Pressable>
          </View>
        ) : isAccepted ? (
          <View style={styles.footerRow}>
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>Total</Text>
              <Text style={styles.footerTotalValue}>{totalLabel}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, styles.flex2, pressed && styles.primaryBtnPressed]}
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel={`Continue to checkout, total ${totalLabel}`}
            >
              <Text style={styles.primaryBtnText}>Continue to checkout</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.terminalBar}>
            <Text style={styles.terminalText}>
              {isRejected ? 'You declined this quote' : isWithdrawn ? 'This quote was withdrawn' : 'This quote has expired'}
            </Text>
          </View>
        )}
      </View>

      <AppDialog
        visible={acceptConfirmVisible}
        tone="success"
        title="Accept this quote?"
        message={`You are accepting ${totalLabel}. Next, you will pick a time and your address.`}
        onRequestClose={() => setAcceptConfirmVisible(false)}
        dismissOnBackdropPress
        actions={[
          { label: 'Cancel', onPress: () => setAcceptConfirmVisible(false), variant: 'secondary' },
          { label: 'Accept quote', onPress: handleConfirmAccept, variant: 'primary' },
        ]}
      />

      <DeclineQuoteModal
        visible={declineModalVisible}
        onClose={() => setDeclineModalVisible(false)}
        onConfirm={handleConfirmDecline}
        isLoading={isRejecting}
      />
    </SafeAreaView>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.bgCard,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorTitle: {
    marginTop: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  errorSubtitle: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  centerBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    minHeight: 60,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: colors.bgHover,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  headerSpacer: {
    width: 44,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
    marginBottom: 24,
  },
  statusTextCol: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  statusText: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  validityRow: {
    marginBottom: 20,
  },

  // Sections
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionTitleSpaced: {
    marginTop: 28,
  },
  sectionGap: {
    height: 28,
  },
  scopeText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  bodyText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  mutedText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  durationLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  durationValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Fixed price note + payment
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
  },
  noteTextCol: {
    flex: 1,
    minWidth: 0,
  },
  noteTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  noteText: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  paymentTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },

  // Revisions
  revisions: {
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  revisionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.7,
  },
  revisionsTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  revisionItem: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  revisionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  revisionVersion: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  revisionPrice: {
    fontFamily: 'Inter-Medium',
    fontSize: 13.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  revisionReason: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textMuted,
  },

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  footerTotal: {
    flex: 1,
    minWidth: 0,
  },
  footerTotalLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  footerTotalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.buttonPrimary,
  },
  primaryBtnPressed: {
    backgroundColor: colors.buttonPrimaryPressed,
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: colors.pureWhite,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgHover,
  },
  secondaryBtnPressed: {
    backgroundColor: colors.buttonSecondaryPressed,
  },
  secondaryBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  terminalBar: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgHover,
  },
  terminalText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
