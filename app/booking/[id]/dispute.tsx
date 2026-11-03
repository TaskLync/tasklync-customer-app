import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, ShieldCheck, Clock, AlertCircle } from 'lucide-react-native';

import { useBookingDetails } from '../../../src/hooks/useBookingDetails';
import { useDispute } from '../../../src/hooks/useDispute';
import { useEvidenceUpload } from '../../../src/hooks/useEvidenceUpload';
import { DisputeReason } from '../../../src/types/booking.types';
import { DisputeInfoBanner } from '../../../src/components/booking/DisputeInfoBanner';
import {
  DisputeReasonRadioGroup,
  DISPUTE_REASONS,
} from '../../../src/components/booking/DisputeReasonRadioGroup';
import { DisputeEvidenceUpload } from '../../../src/components/booking/DisputeEvidenceUpload';
import {
  colors,
  palette,
  fontFamily,
  fontSize,
  radius,
  shadows,
  spacing,
} from '../../../src/design';

/**
 * DisputeScreen (Day 34 Guided Conflict Resolution)
 *
 * Implements Principal-level React Native & UX Architecture (Uber/Ola caliber):
 * - Rock-Solid Soft Keyboard Handling:
 *   * behavior={Platform.OS === 'ios' ? 'padding' : undefined} — eliminates Android double-shrink
 *     layout collapse under softwareKeyboardLayoutMode: 'resize'.
 *   * Header pinned outside KeyboardAvoidingView with safe insets.
 *   * Pressable card container ensures tapping any part of the field delegates focus to input.
 *   * Stable border and zero elevation mutation on focus — eliminates native Android RenderNode focus loss.
 *   * Programmatic scroll-into-view on focus so input is never obscured by software keyboard.
 *   * Keyboard listener dynamically collapses bottom chin padding when keyboard is open.
 *   * keyboardShouldPersistTaps="handled" and keyboardDismissMode="on-drag" for natural tactile feel.
 * - Zero-Anxiety Design: Reassuring expectation-setting banner placed structurally first.
 * - Hick's Law: 5 fixed complete-statement options (pre-selected by default).
 * - 3-Slot Independent async photo upload state machines.
 * - Deferred-Submit Pattern: If uploads are in-flight when submitting, auto-dispatches on finish.
 */
export default function DisputeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const { id: rawBookingId } = useLocalSearchParams<{ id: string }>();

  const { booking, isLoading: isBookingLoading } = useBookingDetails(rawBookingId);
  const bookingId = rawBookingId || booking?.id || 'b-active';

  const { openDispute, isSubmitting, error: apiError } = useDispute(bookingId);

  const {
    slots,
    uploadedUrls,
    isAnyUploading,
    pickImage,
    retryUpload,
    removeSlot,
  } = useEvidenceUpload(bookingId);

  // Pre-select first reason by default so user is never blocked by an empty selection
  const [selectedReason, setSelectedReason] = useState<DisputeReason>(DISPUTE_REASONS[0].key);
  const [description, setDescription] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [isDeferredWaiting, setIsDeferredWaiting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmedDesc = description.trim();

  // Cross-platform keyboard event listener for responsive footer positioning
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Programmatic scroll to keep active input visible above keyboard and footer
  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 120 : 180);
  }, []);

  // Execute dispute submission
  const executeSubmission = useCallback(
    async (finalEvidenceUrls: string[]) => {
      const targetId = rawBookingId || booking?.id || 'b-active';
      const reasonLabel =
        DISPUTE_REASONS.find((r) => r.key === selectedReason)?.label || 'Service issue';
      const finalDescription =
        trimmedDesc.length > 0
          ? trimmedDesc
          : `Dispute filed for ${reasonLabel}. The service professional did not complete the job satisfactorily.`;

      try {
        setLocalError(null);

        await openDispute({
          bookingId: targetId,
          reason: selectedReason,
          description: finalDescription,
          evidenceUrls: finalEvidenceUrls.length > 0 ? finalEvidenceUrls : undefined,
        });

        setIsSubmittedSuccess(true);
      } catch (err: any) {
        setLocalError(err?.message || 'Failed to submit dispute. Please try again.');
        setIsDeferredWaiting(false);
      }
    },
    [rawBookingId, booking?.id, selectedReason, trimmedDesc, openDispute]
  );

  // Submit button press handler
  const handleSubmitPress = useCallback(() => {
    if (isSubmitting) return;

    setLocalError(null);

    if (isAnyUploading) {
      // Deferred waiting state while images finish upload
      setIsDeferredWaiting(true);
    } else {
      executeSubmission(uploadedUrls);
    }
  }, [isSubmitting, isAnyUploading, executeSubmission, uploadedUrls]);

  // Watch for deferred upload completion
  useEffect(() => {
    if (isDeferredWaiting && !isAnyUploading) {
      setIsDeferredWaiting(false);
      executeSubmission(uploadedUrls);
    }
  }, [executeSubmission, isAnyUploading, isDeferredWaiting, uploadedUrls]);

  // Success Confirmation Screen
  if (isSubmittedSuccess) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <ShieldCheck size={56} color={colors.primaryDark} strokeWidth={2.2} />
          </View>

          <Text style={styles.successTitle}>Dispute Lodged Successfully</Text>
          <Text style={styles.successSubtitle}>
            Our Trust & Safety team has received your report. Your payment remains securely locked in escrow while our specialists review the provided details.
          </Text>

          <View style={styles.timelineCard}>
            <View style={styles.timelineRow}>
              <Clock size={18} color={palette.infoDark} />
              <Text style={styles.timelineText}>Expected Review Time: Within 24 Hours</Text>
            </View>
            <View style={styles.timelineRow}>
              <CheckCircle2 size={18} color={colors.primaryDark} />
              <Text style={styles.timelineText}>Support Notification: We will update you via SMS & Email</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.doneButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/bookings' as any);
              }
            }}
          >
            <Text style={styles.doneButtonText}>Return to Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const workerName = booking?.worker_name || 'Service Professional';
  const categoryName = booking?.category_name || 'Home Service';
  const totalAmount = booking?.estimated_total
    ? `${booking.currency || 'PKR'} ${booking.estimated_total.toLocaleString()}`
    : '';

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* Screen Header - Pinned at top, stable against keyboard avoidance adjustments */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Raise a Dispute</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {isBookingLoading && !booking ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.bodyFlex}>
            {/* Scrollable Form Body */}
            <ScrollView
              ref={scrollRef}
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: spacing.xl },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Zero-Anxiety Expectation Banner */}
              <DisputeInfoBanner />

              {/* 2. Booking Context Summary Card */}
              <View style={styles.bookingContextCard}>
                <View style={styles.contextHeader}>
                  <Text style={styles.contextWorker}>{workerName}</Text>
                  {totalAmount ? <Text style={styles.contextAmount}>{totalAmount}</Text> : null}
                </View>
                <Text style={styles.contextService}>{categoryName}</Text>
                <Text style={styles.contextDate}>
                  Job ID: {bookingId ? `#${bookingId.slice(-8).toUpperCase()}` : ''}
                </Text>
              </View>

              {/* 3. Reason Radio Group (5 Fixed Choices) */}
              <DisputeReasonRadioGroup
                selectedReason={selectedReason}
                onSelectReason={(reason) => {
                  setSelectedReason(reason);
                  setLocalError(null);
                }}
                disabled={isSubmitting || isDeferredWaiting}
              />

              {/* 4. Detailed Description Input */}
              <View style={styles.descSection}>
                <View style={styles.descHeaderRow}>
                  <Text style={styles.descHeading}>Describe the Issue (Optional)</Text>
                  <Text style={styles.charCountText}>
                    {trimmedDesc.length} characters
                  </Text>
                </View>

                <Pressable
                  onPress={() => inputRef.current?.focus()}
                  style={[
                    styles.textInputWrapper,
                    isFocused && styles.textInputFocused,
                    isSubmitting && styles.textInputDisabled,
                  ]}
                  accessible={false}
                >
                  <TextInput
                    ref={inputRef}
                    style={styles.textArea}
                    placeholder="Provide any details about what went wrong, damages, or agreed terms that were not met..."
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={(val) => {
                      setDescription(val);
                      setLocalError(null);
                    }}
                    multiline
                    maxLength={1000}
                    editable={!isSubmitting && !isDeferredWaiting}
                    onFocus={handleInputFocus}
                    onBlur={() => setIsFocused(false)}
                    textAlignVertical="top"
                    accessibilityLabel="Dispute description"
                  />
                </Pressable>
              </View>

              {/* 5. 3-Slot Supporting Evidence Grid */}
              <DisputeEvidenceUpload
                slots={slots}
                onPickImage={pickImage}
                onRemoveSlot={removeSlot}
                onRetrySlot={retryUpload}
                disabled={isSubmitting || isDeferredWaiting}
              />

              {/* Error Banner if any */}
              {localError || apiError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color={colors.textDanger} style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{localError || apiError}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Bottom Action Footer (Dynamically adjusts padding based on keyboard visibility) */}
            <View
              style={[
                styles.footer,
                {
                  paddingBottom: isKeyboardVisible
                    ? spacing.sm + 4
                    : insets.bottom > 0
                    ? insets.bottom + 14
                    : 20,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.submitButton,
                  (isSubmitting || isDeferredWaiting) && styles.submitButtonLoading,
                ]}
                onPress={handleSubmitPress}
                disabled={isSubmitting || isDeferredWaiting}
                accessibilityRole="button"
                accessibilityLabel="Submit Dispute Report"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.textOnGreen} />
                ) : isDeferredWaiting ? (
                  <View style={styles.waitingBtnRow}>
                    <ActivityIndicator size="small" color={colors.textOnGreen} />
                    <Text style={styles.submitButtonText}>Finishing photo upload...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Dispute</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  bodyFlex: {
    flex: 1,
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
  backButton: {
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
  headerPlaceholder: {
    width: 38,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  bookingContextCard: {
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  contextWorker: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 1,
    color: colors.textPrimary,
  },
  contextAmount: {
    fontFamily: fontFamily.inter.bold,
    fontSize: fontSize.dataMD - 1,
    color: colors.primaryDark,
  },
  contextService: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body2 - 1,
    color: colors.textSecondary,
  },
  contextDate: {
    fontFamily: fontFamily.inter.regular,
    fontSize: fontSize.dataXS,
    color: colors.textMuted,
    marginTop: 2,
  },
  descSection: {
    marginVertical: spacing.sm,
  },
  descHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  descHeading: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.label + 1,
    color: colors.textPrimary,
  },
  charCountText: {
    fontFamily: fontFamily.inter.medium,
    fontSize: fontSize.dataXS,
    color: colors.textMuted,
  },
  textInputWrapper: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md - 2,
    minHeight: 110,
  },
  textInputFocused: {
    borderColor: colors.primaryDark,
    backgroundColor: palette.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  textInputDisabled: {
    backgroundColor: palette.gray50,
  },
  textArea: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
    minHeight: 80,
    padding: 0,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderErrorLight,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.caption,
    color: colors.textDanger,
    flex: 1,
  },
  footer: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
    ...shadows.lg,
  },
  submitButton: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonLoading: {
    opacity: 0.85,
  },
  submitButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: colors.textOnGreen,
  },
  waitingBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.green200,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  timelineCard: {
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  doneButton: {
    width: '100%',
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2 + 1,
    color: colors.textOnGreen,
  },
});
