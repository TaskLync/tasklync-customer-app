import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, AlertCircle, Edit3, Lock } from 'lucide-react-native';

import { useBookingDetails } from '../../../src/hooks/useBookingDetails';
import { useReviewEligibility, useSubmitReview, useEditReview, useReviewMediaUpload } from '../../../src/hooks/useReview';
import { useReviewFormState } from '../../../src/hooks/useReviewFormState';
import { useSkipReview } from '../../../src/hooks/useSkipReview';
import { useAuthStore } from '../../../src/store/auth.store';
import { reviewApi, extractReviewErrorMessage } from '../../../src/services/api/review.api';
import { ReviewItem, EditReviewPayload, CreateReviewPayload } from '../../../src/types/review.types';

import { ReviewWorkerContext } from '../../../src/components/review/ReviewWorkerContext';
import { RatingInput } from '../../../src/components/ui/Rating/RatingInput';
import { ReviewTagSelector } from '../../../src/components/review/ReviewTagSelector';
import { ReviewPhotoUpload } from '../../../src/components/review/ReviewPhotoUpload';
import { ReviewCommentInput } from '../../../src/components/review/ReviewCommentInput';
import { ReviewSuccessState } from '../../../src/components/review/ReviewSuccessState';
import { ReviewStarRow } from '../../../src/components/review/ReviewStarRow';

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from '../../../src/design';

/**
 * ReviewScreen
 *
 * Implements Principal UI/UX & Mobile Engineering standards (Uber/Foodpanda/Airbnb caliber):
 * - Clear top-to-bottom hierarchy: Context -> Hero Star Rating -> Compliment Tags -> Detailed Feedback -> Photos -> CTAs
 * - Bulletproof keyboard handling: KeyboardAvoidingView with non-absolute scroll-integrated CTAs
 * - Zero unmounting during typing: guards against re-render re-fetch unmounting loop
 * - Full 14-day creation window & 48-hour customer edit window support
 * - Cloudinary CDN photo uploading (up to 5 photos)
 * - Safe areas and responsive Android layout handling
 */
export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { id: bookingId, editReviewId } = useLocalSearchParams<{
    id: string;
    editReviewId?: string;
  }>();

  const user = useAuthStore((s) => s.user);

  // 1. Remote Data Queries
  const { booking, isLoading: isBookingLoading } = useBookingDetails(bookingId);
  const {
    data: eligibility,
    isLoading: isEligibilityLoading,
  } = useReviewEligibility(bookingId || '', Boolean(bookingId));

  // 2. Form State & Media Hooks
  const {
    overallRating,
    tags,
    comment,
    canSubmit,
    setOverallRating,
    toggleTag,
    setComment,
    initializeFromReview,
  } = useReviewFormState();

  const {
    photos,
    isUploading,
    pickAndUploadImage,
    removePhoto,
    resetPhotos,
  } = useReviewMediaUpload(bookingId);

  // 3. Mutations
  const { mutateAsync: submitReviewAsync, isPending: isSubmitting } = useSubmitReview();
  const { mutateAsync: editReviewAsync, isPending: isEditing } = useEditReview();
  const { skipReview } = useSkipReview(bookingId || '');

  // 4. Local States for Mode & Edit Window
  const [existingReview, setExistingReview] = useState<ReviewItem | null>(null);
  const [isLoadingExistingReview, setIsLoadingExistingReview] = useState<boolean>(false);
  const [initialChecked, setInitialChecked] = useState<boolean>(false);
  const hasCheckedExistingRef = useRef<boolean>(false);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editHoursRemaining, setEditHoursRemaining] = useState<number | null>(null);
  const [isEditWindowExpired, setIsEditWindowExpired] = useState<boolean>(false);

  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 5. Detect Existing Review & Edit Window (48h) - Run only once on mount
  useEffect(() => {
    let isMounted = true;

    async function checkExistingReview() {
      if (!bookingId || !user?.id || hasCheckedExistingRef.current) return;
      hasCheckedExistingRef.current = true;

      // If already reviewed or editReviewId is present
      if (eligibility?.isReviewed || editReviewId) {
        try {
          setIsLoadingExistingReview(true);
          let foundReview: ReviewItem | null = null;

          if (editReviewId) {
            foundReview = await reviewApi.getReviewById(editReviewId);
          } else {
            const userReviewsRes = await reviewApi.getUserReviews(user.id);
            foundReview =
              userReviewsRes.reviews.find((r) => r.booking_id === bookingId) || null;
          }

          if (isMounted && foundReview) {
            setExistingReview(foundReview);
            initializeFromReview(foundReview);
            if (foundReview.photo_urls && foundReview.photo_urls.length > 0) {
              resetPhotos(foundReview.photo_urls);
            }

            // Calculate 48-hour edit window from created_at
            const createdAtTime = new Date(foundReview.created_at).getTime();
            const now = new Date().getTime();
            const diffHours = (now - createdAtTime) / (1000 * 60 * 60);

            if (diffHours < 48) {
              setIsEditMode(true);
              setEditHoursRemaining(Math.max(1, Math.round(48 - diffHours)));
              setIsEditWindowExpired(false);
            } else {
              setIsEditMode(false);
              setIsEditWindowExpired(true);
            }
          }
        } catch {
          // Fallback gracefully
        } finally {
          if (isMounted) {
            setIsLoadingExistingReview(false);
            setInitialChecked(true);
          }
        }
      } else {
        if (isMounted) {
          setInitialChecked(true);
        }
      }
    }

    if (eligibility !== undefined) {
      checkExistingReview();
    }

    return () => {
      isMounted = false;
    };
  }, [bookingId, eligibility?.isReviewed, editReviewId, initializeFromReview, resetPhotos, user?.id]);

  // Keyboard scroll helper
  const handleCommentFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 180);
  }, []);

  // Success Navigation
  const handleNavigateAfterSuccess = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/bookings' as any);
    }
  }, [router]);

  // Submit or Edit Handler
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting || isEditing || !bookingId) return;

    try {
      setErrorMessage(null);
      const trimmedComment = comment.trim();

      if (isEditMode && existingReview) {
        // Edit Review (PATCH /reviews/:id)
        const payload: EditReviewPayload = {
          rating: overallRating,
          ...(trimmedComment ? { comment: trimmedComment } : {}),
          ...(tags.length > 0 ? { tags } : {}),
        };

        await editReviewAsync({
          reviewId: existingReview.id,
          payload,
        });
      } else {
        // Submit New Review (POST /reviews)
        const payload: CreateReviewPayload = {
          booking_id: bookingId,
          rating: overallRating,
          ...(trimmedComment ? { comment: trimmedComment } : {}),
          ...(tags.length > 0 ? { tags } : {}),
          ...(photos.length > 0 ? { photo_urls: photos } : {}),
        };

        await submitReviewAsync(payload);
      }

      setHasSubmitted(true);
    } catch (err: any) {
      const msg = extractReviewErrorMessage(err);
      setErrorMessage(msg);
    }
  }, [
    canSubmit,
    isSubmitting,
    isEditing,
    bookingId,
    isEditMode,
    existingReview,
    editReviewAsync,
    overallRating,
    comment,
    tags,
    submitReviewAsync,
    photos,
  ]);

  // Only show full-screen loader on initial load
  const isInitialLoading =
    !initialChecked &&
    ((isBookingLoading && !booking) ||
      (isEligibilityLoading && !eligibility) ||
      isLoadingExistingReview);

  // Dynamic feedback text for rating
  const getRatingFeedback = (rating: number) => {
    switch (rating) {
      case 5:
        return 'Outstanding experience! ⭐';
      case 4:
        return 'Very good service! 👍';
      case 3:
        return 'Average experience 👌';
      case 2:
        return 'Below expectations';
      case 1:
        return 'Poor experience';
      default:
        return 'Tap a star to rate your overall service';
    }
  };

  // Render Success Payoff View
  if (hasSubmitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />
        <ReviewSuccessState onDismiss={handleNavigateAfterSuccess} />
      </View>
    );
  }

  // 1. Expired Review Window (14-day creation window passed)
  if (!isInitialLoading && eligibility?.isExpired && !existingReview) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Review Expired</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.centerMessageCard}>
          <View style={[styles.statusIconWrap, { backgroundColor: colors.bgHover }]}>
            <Clock size={32} color={colors.textSecondary} />
          </View>
          <Text style={styles.messageTitle}>Review Window Expired</Text>
          <Text style={styles.messageSubtitle}>
            Reviews must be submitted within 14 days of booking completion. The review period for this service has now closed.
          </Text>
          <Pressable style={styles.secondaryActionBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryActionBtnText}>Back to Bookings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 2. Already Reviewed and 48-hour Edit Window Expired (Review Permanently Locked)
  if (!isInitialLoading && isEditWindowExpired && existingReview) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Review</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.lockedBanner}>
            <Lock size={15} color={colors.textSecondary} />
            <Text style={styles.lockedBannerText}>
              Review locked. Reviews can only be edited within 48 hours of submission.
            </Text>
          </View>

          <View style={styles.readOnlyCard}>
            <View style={styles.readOnlyScoreRow}>
              <Text style={styles.readOnlyRatingText}>{existingReview.rating}.0</Text>
              <ReviewStarRow rating={existingReview.rating} size="md" />
            </View>

            {existingReview.tags && existingReview.tags.length > 0 && (
              <View style={styles.tagsDisplayRow}>
                {existingReview.tags.map((t) => (
                  <View key={t} style={styles.tagDisplayChip}>
                    <Text style={styles.tagDisplayChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            {existingReview.comment ? (
              <Text style={styles.readOnlyComment}>"{existingReview.comment}"</Text>
            ) : null}

            {existingReview.worker_reply ? (
              <View style={styles.workerReplyBox}>
                <Text style={styles.workerReplyTitle}>Professional's Response</Text>
                <Text style={styles.workerReplyBody}>{existingReview.worker_reply}</Text>
              </View>
            ) : null}
          </View>

          <Pressable style={styles.primaryPillBtn} onPress={() => router.back()}>
            <Text style={styles.primaryPillBtnText}>Done</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const isCompany = Boolean(
    booking?.is_company ||
    booking?.provider_type === 'COMPANY'
  );
  const workerName = isCompany
    ? (booking?.provider_name || booking?.worker_name || 'Verified Service Agency')
    : (booking?.worker_name || 'Service Professional');
  const workerAvatar = isCompany
    ? (booking?.provider_avatar_url || booking?.worker_avatar_url || null)
    : (booking?.worker_avatar_url || null);
  const serviceName = booking?.category_name || 'Home Service';
  const completedDate = booking?.completed_at || booking?.created_at;

  const isSaving = isSubmitting || isEditing;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* Screen Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Your Review' : 'Rate your experience'}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {isInitialLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingLabel}>Loading booking details...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 40 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Edit Mode Notice Banner */}
            {isEditMode && editHoursRemaining !== null && (
              <View style={styles.editWindowBanner}>
                <Edit3 size={15} color={colors.textGreen} />
                <Text style={styles.editWindowText}>
                  Editing Review · <Text style={styles.editWindowBold}>{editHoursRemaining} hours</Text> remaining to make changes.
                </Text>
              </View>
            )}

            {/* 1. Worker & Job Context Card */}
            <ReviewWorkerContext
              workerName={workerName}
              workerAvatar={workerAvatar}
              serviceName={serviceName}
              completedDate={completedDate}
            />

            {/* 2. Primary Hero Rating Card */}
            <View style={styles.primaryRatingCard}>
              <Text style={styles.primaryRatingTitle}>
                {isEditMode ? 'Update Overall Rating' : 'How was your experience?'}
              </Text>
              <Text style={styles.primaryRatingSubtitle}>
                {getRatingFeedback(overallRating)}
              </Text>

              <View style={styles.ratingInputWrapper}>
                <RatingInput
                  value={overallRating}
                  onChange={setOverallRating}
                  size="lg"
                  disabled={isSaving}
                />
              </View>
            </View>

            {/* 3. Review Compliment Tags Selector */}
            <ReviewTagSelector
              selectedTags={tags}
              onToggleTag={toggleTag}
              disabled={isSaving}
            />

            {/* 4. Written Feedback (up to 2000 chars) */}
            <ReviewCommentInput
              value={comment}
              onChangeText={setComment}
              maxLength={2000}
              disabled={isSaving}
              onFocus={handleCommentFocus}
            />

            {/* 5. Photo Upload (Only active in initial submission as per backend spec) */}
            {!isEditMode && (
              <ReviewPhotoUpload
                photos={photos}
                maxPhotos={5}
                isUploading={isUploading}
                onPickPhoto={pickAndUploadImage}
                onRemovePhoto={removePhoto}
                disabled={isSaving}
              />
            )}

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.textDanger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 6. Form Actions - Integrated naturally inside scrollable flow */}
            <View style={styles.actionsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  (!canSubmit || isSaving) && styles.submitButtonDisabled,
                  isSaving && styles.submitButtonLoading,
                  pressed && canSubmit && !isSaving && styles.submitButtonPressed,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || isSaving}
                accessibilityRole="button"
                accessibilityLabel={isEditMode ? 'Save Changes' : 'Submit Review'}
                accessibilityState={{ disabled: !canSubmit || isSaving }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      (!canSubmit || isSaving) && styles.submitButtonTextDisabled,
                    ]}
                  >
                    {isEditMode ? 'Save Changes' : 'Submit Review'}
                  </Text>
                )}
              </Pressable>

              {!isEditMode && (
                <Pressable
                  style={({ pressed }) => [
                    styles.skipButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={skipReview}
                  disabled={isSaving}
                  hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                  accessibilityRole="button"
                  accessibilityLabel="Skip review for now"
                >
                  <Text style={styles.skipButtonText}>Skip for now</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.bgCard,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: colors.textPrimary,
  },
  headerPlaceholder: {
    width: 38,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: spacing.md,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    marginTop: 12,
  },
  editWindowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  editWindowText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textGreenDark,
    marginLeft: 8,
    flex: 1,
  },
  editWindowBold: {
    fontFamily: fontFamily.jakarta.semiBold,
  },
  primaryRatingCard: {
    backgroundColor: colors.bgCard,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  primaryRatingTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  primaryRatingSubtitle: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  ratingInputWrapper: {
    paddingVertical: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.borderErrorLight,
    marginTop: spacing.md,
  },
  errorText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.dataSM,
    color: colors.textDanger,
    flex: 1,
  },

  // Actions Container
  actionsContainer: {
    marginTop: spacing.xl,
    gap: 12,
  },
  submitButton: {
    height: 50,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonLoading: {
    opacity: 0.85,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.99 }],
  },
  submitButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 1,
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.textMuted,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  skipButtonText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
  },

  // Expired / Locked Message States
  centerMessageCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  messageTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  secondaryActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  secondaryActionBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },

  // Locked View
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgHover,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedBannerText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  readOnlyCard: {
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  readOnlyScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  readOnlyRatingText: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 28,
    color: colors.textPrimary,
  },
  tagsDisplayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  tagDisplayChip: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  tagDisplayChipText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.textGreen,
  },
  readOnlyComment: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  workerReplyBox: {
    backgroundColor: colors.bgApp,
    borderRadius: radius.md,
    padding: 12,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  workerReplyTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.dataSM,
    color: colors.primaryDark,
    marginBottom: 4,
  },
  workerReplyBody: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  primaryPillBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPillBtnText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2,
    color: colors.white,
  },
});
