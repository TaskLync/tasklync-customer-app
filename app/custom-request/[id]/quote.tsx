import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react-native';

import { typography } from '../../../src/design';
import { useCustomRequestDetail } from '../../../src/hooks/custom-requests/useCustomRequestDetail';
import { useQuoteDetail } from '../../../src/hooks/custom-requests/useQuoteDetail';
import { QuoteBreakdownCard } from '../../../src/components/custom-requests/QuoteBreakdownCard';
import { QuoteExpiryCountdown } from '../../../src/components/custom-requests/QuoteExpiryCountdown';
import { DeclineQuoteModal } from '../../../src/components/custom-requests/DeclineQuoteModal';
import { QuotePricingType, QuoteStatus } from '../../../src/types/customRequest.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';

export default function QuoteReviewScreen() {
  const { colors, palette } = useAppTheme();
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/custom-request/${requestId}` as any);
    }
  };

  const handleAcceptPress = () => {
    if (!activeQuote) return;
    setAcceptConfirmVisible(true);
  };

  const handleConfirmAccept = () => {
    setAcceptConfirmVisible(false);
    if (activeQuote) {
      acceptQuote(activeQuote.id);
    }
  };

  const handleConfirmDecline = (reason: string) => {
    setDeclineModalVisible(false);
    if (activeQuote) {
      rejectQuote({ quoteId: activeQuote.id, reason });
    }
  };

  const isLoading = isRequestLoading || isQuoteLoading;

  if (isLoading && !activeQuote) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={palette.green600} />
        <Text style={styles.loadingText}>Loading formal quote...</Text>
      </SafeAreaView>
    );
  }

  if (!activeQuote) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <AlertTriangle size={48} color={palette.gray400} />
        <Text style={styles.errorTitle}>No Quote Found</Text>
        <Text style={styles.errorSubtitle}>
          The professional has not submitted a formal quote yet or it has been withdrawn.
        </Text>
        <TouchableOpacity style={styles.backButtonCenter} onPress={handleBack}>
          <Text style={styles.backButtonCenterText}>Go to Request Details</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isFixed = activeQuote.quote_type === QuotePricingType.FIXED_QUOTE;
  const isSent = activeQuote.status === QuoteStatus.SENT;
  const isAccepted = activeQuote.status === QuoteStatus.ACCEPTED;
  const isRejected = activeQuote.status === QuoteStatus.REJECTED;
  const isWithdrawn = activeQuote.status === QuoteStatus.WITHDRAWN;
  const isExpired = activeQuote.status === QuoteStatus.EXPIRED;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={22} color={palette.gray900} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Review Quote</Text>
          <Text style={styles.headerSubtitle}>
            {request?.provider_name || request?.worker_name
              ? `From ${request?.provider_name || request?.worker_name}`
              : 'Professional Quote'}
          </Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v{activeQuote.version}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pricing Type Banner */}
        <View style={[styles.pricingTypeBanner, isFixed ? styles.fixedBanner : styles.estimateBanner]}>
          <Info size={16} color={isFixed ? colors.textGreen : colors.warningMedium} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={[styles.pricingTypeTitle, isFixed ? styles.fixedTitle : styles.estimateTitle]}>
              {isFixed ? 'Guaranteed Fixed Price Quote' : 'Preliminary Estimate'}
            </Text>
            <Text style={[styles.pricingTypeDesc, isFixed ? styles.fixedDesc : styles.estimateDesc]}>
              {isFixed
                ? 'This quoted price is fully binding for the specified scope of work.'
                : 'Final labor charges are subject to on-site physical diagnosis.'}
            </Text>
          </View>
        </View>

        {/* Validity Countdown (if still SENT) */}
        {isSent && activeQuote.valid_until && (
          <QuoteExpiryCountdown validUntil={activeQuote.valid_until} />
        )}

        {/* Status Callouts if not SENT */}
        {isAccepted && (
          <View style={styles.acceptedBanner}>
            <CheckCircle size={18} color={colors.textGreen} />
            <Text style={styles.acceptedBannerText}>
              You have accepted this quote. Please proceed to checkout to finalize your appointment.
            </Text>
          </View>
        )}

        {isRejected && (
          <View style={styles.declinedBanner}>
            <AlertCircle size={18} color={colors.dangerMedium} />
            <Text style={styles.declinedBannerText}>
              You declined this quote. The technician has been notified.
            </Text>
          </View>
        )}

        {/* Price Breakdown Card */}
        <QuoteBreakdownCard quote={activeQuote} />

        {/* Scope of Work */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Scope of Work</Text>
          <Text style={styles.scopeDescription}>{activeQuote.scope_description}</Text>

          {activeQuote.estimated_duration_hours ? (
            <View style={styles.durationRow}>
              <Clock size={16} color={palette.gray500} />
              <Text style={styles.durationText}>
                Estimated Duration: ~{activeQuote.estimated_duration_hours} hours
              </Text>
            </View>
          ) : null}
        </View>

        {/* Terms and Exclusions */}
        {(activeQuote.terms_and_exclusions || activeQuote.terms_and_conditions) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Terms & Material Exclusions</Text>
            <Text style={styles.termsText}>
              {activeQuote.terms_and_exclusions || activeQuote.terms_and_conditions}
            </Text>
          </View>
        )}

        {/* Revision History Collapsible */}
        {revisions.length > 0 && (
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.revisionsHeader}
              onPress={() => setShowRevisions(!showRevisions)}
              activeOpacity={0.7}
            >
              <View style={styles.revisionsHeaderLeft}>
                <History size={18} color={palette.gray600} />
                <Text style={styles.revisionsHeaderTitle}>
                  Quote Revision History ({revisions.length})
                </Text>
              </View>
              {showRevisions ? (
                <ChevronUp size={18} color={palette.gray500} />
              ) : (
                <ChevronDown size={18} color={palette.gray500} />
              )}
            </TouchableOpacity>

            {showRevisions && (
              <View style={styles.revisionsContent}>
                {revisions.map((rev) => (
                  <View key={rev.id || rev.version} style={styles.revisionItem}>
                    <View style={styles.revisionItemHeader}>
                      <Text style={styles.revisionVersion}>Revision v{rev.version}</Text>
                      <Text style={styles.revisionPrice}>
                        PKR {Number(rev.total_price).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.revisionScope} numberOfLines={2}>
                      {rev.scope_description}
                    </Text>
                    {rev.superseded_reason ? (
                      <Text style={styles.revisionReason}>
                        Superseded: {rev.superseded_reason}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
        ]}
      >
        {isSent && (
          <View style={styles.footerButtonsRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => setDeclineModalVisible(true)}
              disabled={isAccepting || isRejecting}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, (isAccepting || isRejecting) && styles.acceptBtnDisabled]}
              onPress={handleAcceptPress}
              disabled={isAccepting || isRejecting}
              activeOpacity={0.8}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color={colors.pureWhite} />
              ) : (
                <Text style={styles.acceptBtnText}>Accept & Book</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isAccepted && (
          <TouchableOpacity
            style={styles.proceedCheckoutBtn}
            onPress={() => router.push(`/custom-request/${requestId}/checkout` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.proceedCheckoutBtnText}>Proceed to Checkout →</Text>
          </TouchableOpacity>
        )}

        {(isRejected || isWithdrawn || isExpired) && (
          <View style={styles.terminalStateBar}>
            <Text style={styles.terminalStateText}>
              {isRejected
                ? 'Quote was declined'
                : isWithdrawn
                ? 'Quote was withdrawn by professional'
                : 'Quote has expired'}
            </Text>
          </View>
        )}
      </View>

      {/* Accept Confirmation Modal */}
      <Modal
        visible={acceptConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAcceptConfirmVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAcceptConfirmVisible(false)}>
          <View style={styles.confirmSheet}>
            <View style={styles.confirmIconWrap}>
              <CheckCircle size={32} color={palette.green600} />
            </View>
            <Text style={styles.confirmTitle}>Accept this Quote?</Text>
            <Text style={styles.confirmSubtitle}>
              You are accepting the quoted price of PKR {activeQuote.total_price.toLocaleString()}. Next, you will select your preferred time slot and delivery address.
            </Text>
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setAcceptConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmProceedBtn}
                onPress={handleConfirmAccept}
              >
                <Text style={styles.confirmProceedBtnText}>Confirm Acceptance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Decline Quote Sheet Modal */}
      <DeclineQuoteModal
        visible={declineModalVisible}
        onClose={() => setDeclineModalVisible(false)}
        onConfirm={handleConfirmDecline}
        isLoading={isRejecting}
      />
    </SafeAreaView>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvasGray,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: palette.canvasGray,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: palette.gray600,
  },
  errorTitle: {
    marginTop: 16,
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: palette.gray900,
  },
  errorSubtitle: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
  backButtonCenter: {
    marginTop: 18,
    backgroundColor: palette.green600,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonCenterText: {
    color: colors.pureWhite,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: palette.gray900,
  },
  headerSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
  },
  versionBadge: {
    backgroundColor: colors.bgHover,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: palette.gray600,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  pricingTypeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  fixedBanner: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryBorder,
  },
  estimateBanner: {
    backgroundColor: palette.amber50,
    borderColor: colors.warningBorder,
  },
  pricingTypeTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  fixedTitle: { color: colors.textGreen },
  estimateTitle: { color: colors.textWarningMedium },
  pricingTypeDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  fixedDesc: { color: colors.textGreenDark },
  estimateDesc: { color: colors.textWarning },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBorderSubtle,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  acceptedBannerText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.textGreen,
    marginLeft: 8,
    flex: 1,
  },
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderErrorLight,
  },
  declinedBannerText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.dangerMedium,
    marginLeft: 8,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: palette.gray900,
    marginBottom: 8,
  },
  scopeDescription: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray700,
    lineHeight: 20,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  durationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: palette.gray600,
    marginLeft: 6,
  },
  termsText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray600,
    lineHeight: 18,
  },
  revisionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revisionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revisionsHeaderTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.gray800,
    marginLeft: 8,
  },
  revisionsContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  revisionItem: {
    padding: 10,
    backgroundColor: colors.bgSubtle,
    borderRadius: 8,
    marginBottom: 8,
  },
  revisionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  revisionVersion: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: palette.gray900,
  },
  revisionPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.green600,
  },
  revisionScope: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: palette.gray600,
    lineHeight: 15,
  },
  revisionReason: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: palette.gray400,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.borderErrorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: colors.dangerMedium,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: palette.green600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.pureWhite,
  },
  proceedCheckoutBtn: {
    backgroundColor: palette.green600,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedCheckoutBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.pureWhite,
  },
  terminalStateBar: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  terminalStateText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.gray500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  confirmSheet: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryBorderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: palette.gray900,
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray600,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
  },
  confirmCancelBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray700,
  },
  confirmProceedBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: palette.green600,
    alignItems: 'center',
  },
  confirmProceedBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.pureWhite,
  },
});
