import { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { shareEntity } from '../../src/services/links/shareEntity';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkerProfile } from '@hooks/useWorkerProfile';
import { useWorkerReviews } from '@hooks/useWorkerReviews';
import { useWorkerPortfolio } from '@hooks/useWorkerPortfolio';
import { useWorkerOffers } from '@hooks/useWorkerOffers';
import { WorkerOffersSection } from '@components/offers/WorkerOffersSection';
import { WorkerProfileHeader } from '@components/worker/WorkerProfileHeader';
import { WorkerCompactHeader } from '@components/worker/WorkerCompactHeader';
import { WorkerAvailabilityCard } from '@components/worker/WorkerAvailabilityCard';
import { WorkerStats } from '@components/worker/WorkerStats';
import { WorkerBio } from '@components/worker/WorkerBio';
import { WorkerSkillList } from '@components/worker/WorkerSkillList';
import { WorkerServicesSection } from '@components/worker/WorkerServicesSection';
import {
  WorkerProfileStickyFooter,
  getWorkerProfileFooterHeight,
} from '@components/worker/WorkerProfileStickyFooter';
import { MoreOptionsMenu } from '@components/worker/MoreOptionsMenu';
import { WorkerPortfolioGrid } from '@components/worker/WorkerPortfolioGrid';
import { ReviewSummary } from '@components/review/ReviewSummary';
import { ReviewCard } from '@components/review/ReviewCard';
import { ImageViewer } from '@components/common/ImageViewer';
import { BlockWorkerSheet } from '../../src/components/worker/BlockWorkerSheet';
import { useBlockWorker } from '../../src/hooks/useBlockWorker';
import { getPersistedBookings } from '../../src/services/api/booking.api';
import { ArrowLeft, ChevronRight, FilePen } from 'lucide-react-native';

import {
  SkeletonWorkerProfileHero,
  SkeletonWorkerStats,
  SkeletonWorkerBio,
  SkeletonWorkerSkillList,
  SkeletonWorkerServiceRow,
  SkeletonReviewCard,
  SkeletonGroup,
  SkeletonText,
} from '@components/ui/Skeleton';

import { typography } from '@design/typography';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';
import { useBookNow } from '../../src/hooks/useBookNow';
import { BookNowServiceSheet } from '../../src/components/worker/BookNowServiceSheet';
import { WorkerConflictModal } from '../../src/components/cart/WorkerConflictModal';
import { useCartStore } from '../../src/store/cart.store';

// Spacing system — sections are separated by whitespace, not divider lines.
//   20  screen gutter
//   12  between closely related items (identity → availability → stats)
//   32  between sections
const SCREEN_PADDING = 20;
const GROUP_GAP = 12;
const SECTION_GAP = 32;
// Extra room under the last section so it never sits flush against the sticky CTA.
const FOOTER_BREATHING_ROOM = 24;

export default function WorkerProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // Derived from the footer's real height (incl. safe-area inset) so content is never hidden behind it.
  const footerClearance = getWorkerProfileFooterHeight(insets.bottom) + FOOTER_BREATHING_ROOM;

  const scrollY = useSharedValue(0);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [blockSheetVisible, setBlockSheetVisible] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const blockWorkerMutation = useBlockWorker();

  const { worker, skills, services, isServicesLoading, isLoading, isError, refetch } =
    useWorkerProfile(id || '');
  const {
    reviews: previewReviews,
    summary,
    isLoading: isReviewsLoading,
  } = useWorkerReviews(id || '');
  const { images: portfolioImages } = useWorkerPortfolio(id || '');
  const { offers: workerOffers, isLoading: isOffersLoading } = useWorkerOffers(id || '');
  const bookNow = useBookNow(worker, services);
  const cartWorkerName = useCartStore((s) => s.worker?.name);

  const hasActiveBooking = Boolean(
    getPersistedBookings().find(
      (b) => b.worker_id === id && (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS' || b.status === 'PENDING')
    )
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/' as any);
    }
  };

  const handleShare = async () => {
    if (!worker) return;
    await shareEntity('worker', worker.id, `Check out ${worker.name} on Tasklync! Providing expert home services.`);
  };

  const handleMore = () => {
    setOptionsVisible(true);
  };

  const handleCloseOptions = () => {
    setOptionsVisible(false);
  };

  const handleReport = () => {
    setOptionsVisible(false);
    showAlert('Report Worker', 'Thank you for reporting. Our safety team will review this profile immediately.');
  };

  const handleBlock = () => {
    setOptionsVisible(false);
    setBlockSheetVisible(true);
  };

  const handleChat = () => {
    const existing = getPersistedBookings().find(
      (b) => b.worker_id === id && (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS' || b.status === 'PENDING')
    );
    if (existing) {
      router.push({
        pathname: `/booking/${existing.id}/chat`,
        params: {
          workerName: worker?.name || existing.worker_name,
          workerAvatar: worker?.avatarUrl || (worker as any)?.avatar_url || existing.worker_avatar_url,
          workerPhone: (worker as any)?.phone || (worker as any)?.phone_number || existing.worker_phone,
          workerId: worker?.id || existing.worker_id,
        },
      } as any);
    } else {
      showAlert(
        'Direct Chat',
        `Direct chat with ${worker?.name || 'this worker'} is enabled once you book a service.`
      );
    }
  };

  // Book Now enters the existing booking flow (cart -> schedule -> address -> summary -> payment).
  const handleBookNow = bookNow.start;

  const handleRatingPress = () => {
    router.push(`/worker/${id}/reviews`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <ThemedStatusBar />
        {/* Real back button: the user can always leave while the profile loads. */}
        <View style={styles.loadingNav}>
          <Pressable
            onPress={handleBack}
            style={styles.loadingBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
        </View>
        {/* One SkeletonGroup = one animated node for the whole page. */}
        <SkeletonGroup accessibilityLabel="Loading worker profile">
          <SkeletonWorkerProfileHero />
          <View style={styles.contentCard}>
            <SkeletonWorkerStats />
            <View style={styles.section}>
              <SkeletonWorkerBio />
            </View>
            <View style={styles.section}>
              <SkeletonWorkerSkillList />
            </View>
            <View style={styles.section}>
              <SkeletonText fontSize={17} lineHeight={22} width={80} style={styles.skeletonTitle} />
              <SkeletonWorkerServiceRow />
              <SkeletonWorkerServiceRow />
            </View>
          </View>
        </SkeletonGroup>
      </SafeAreaView>
    );
  }

  if (isError || !worker) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
        <EmptyState
          type="no-workers"
          title="Worker Profile Not Found"
          description="This service professional is unavailable or does not exist."
          actionLabel="Try Again"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  const isAvailable = worker.availabilityStatus === 'AVAILABLE';

  // Prefer the review-service summary; fall back to the profile's own counters (both are backend data).
  const summaryTotal = summary ? summary.totalReviews ?? (summary as any).total ?? 0 : undefined;
  const reviewCount = summaryTotal ?? worker.totalReviews ?? 0;
  const reviewSummary =
    summary ?? ({ avgRating: worker.avgRating, totalReviews: worker.totalReviews } as any);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />
      {/* Sticky Compact Header (Visible past scroll offset) */}
      <WorkerCompactHeader
        worker={worker}
        scrollY={scrollY}
        onBack={handleBack}
        onBookNow={handleBookNow}
      />

      {/* Main Scroll Content */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Identity: avatar, name, verification, category · city, rating */}
        <WorkerProfileHeader
          worker={worker}
          scrollY={scrollY}
          onBack={handleBack}
          onShare={handleShare}
          onMore={handleMore}
          onRatingPress={reviewCount > 0 ? handleRatingPress : undefined}
        />

        <View style={[styles.contentCard, { paddingBottom: footerClearance }]}>
          {/* Availability + performance — one tight group directly under the identity */}
          <WorkerAvailabilityCard
            status={worker.availabilityStatus}
            availableUntil={worker.availableUntil}
          />
          <WorkerStats
            yearsExperience={worker.yearsExperience}
            totalJobs={worker.totalBookings}
            avgResponseMins={worker.responseTimeMins}
            style={styles.statsCard}
          />

          {/* Each section owns its top spacing and renders nothing when empty,
              so missing data never leaves an orphaned gap. */}
          {/* Automatic offers: hidden entirely when there are none. Edge to edge so the cards scroll under the gutter. */}
          <WorkerOffersSection
            offers={workerOffers}
            isLoading={isOffersLoading}
            gutter={SCREEN_PADDING}
            style={[styles.section, styles.fullBleed]}
          />

          <WorkerBio bio={worker.bio} style={styles.section} />

          <WorkerSkillList skills={skills} style={styles.section} />

          <WorkerServicesSection
            services={services}
            workerId={worker.id}
            workerName={worker.name}
            workerAvatar={worker.avatarUrl}
            workerRating={worker.avgRating}
            workerCategory={worker.categories?.[0]}
            workerVerified={worker.isVerified}
            startingPrice={worker.startingPrice}
            isLoading={isServicesLoading}
            style={styles.section}
            footer={
              <Pressable
                style={({ pressed }) => [styles.customQuoteRow, pressed && styles.pressed]}
                onPress={() =>
                  router.push({
                    pathname: '/custom-request/new' as any,
                    params: {
                      workerId: worker.id,
                      categoryId: worker.categories?.[0] || '',
                    },
                  })
                }
                accessibilityRole="button"
              >
                <View style={styles.customQuoteIcon}>
                  <FilePen size={16} color={colors.primaryDark} strokeWidth={2.2} />
                </View>
                <View style={styles.customQuoteTextCol}>
                  <Text style={styles.customQuoteTitle}>Need something else?</Text>
                  <Text style={styles.customQuoteSubtitle}>Request a custom quote</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </Pressable>
            }
          />

          {portfolioImages.length > 0 && (
            <View style={[styles.section, styles.fullBleed]}>
              <WorkerPortfolioGrid
                images={portfolioImages.slice(0, 6)}
                workerId={worker.id}
                maxVisible={6}
                horizontalPadding={SCREEN_PADDING}
                onViewAll={() => router.push(`/worker/${id}/portfolio`)}
                onImagePress={(_images, index) => {
                  setViewerStartIndex(index);
                  setViewerVisible(true);
                }}
                showHeader={true}
              />
            </View>
          )}

          {/* Reviews — real summary only; no stars or score when there are no reviews */}
          <View style={styles.section}>
            {reviewCount > 0 ? (
              <>
                <ReviewSummary summary={reviewSummary} onViewAll={handleRatingPress} />
                {isReviewsLoading && previewReviews.length === 0 ? (
                  <View style={styles.reviewList}>
                    <SkeletonReviewCard />
                  </View>
                ) : previewReviews.length > 0 && (
                  <View style={styles.reviewList}>
                    {previewReviews.slice(0, 3).map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        showReply={true}
                        maxCommentLines={3}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Reviews</Text>
                <Text style={styles.emptyText}>
                  No reviews yet. Reviews appear here after customers complete a booking.
                </Text>
              </>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating Action Sticky Footer */}
      <WorkerProfileStickyFooter
        workerId={worker.id}
        workerName={worker.name}
        onChat={handleChat}
        onBookNow={handleBookNow}
        isWorkerAvailable={isAvailable}
        isStarting={bookNow.isStarting}
        notice={bookNow.notice}
      />

      <BookNowServiceSheet
        visible={bookNow.chooser.visible}
        workerName={worker.name}
        services={bookNow.chooser.services}
        onConfirm={bookNow.chooser.onConfirm}
        onClose={bookNow.chooser.onClose}
      />

      <WorkerConflictModal
        visible={bookNow.conflict.visible}
        onCancel={bookNow.conflict.onCancel}
        onReplace={bookNow.conflict.onReplace}
        currentWorkerName={cartWorkerName}
        incomingWorkerName={worker.name}
      />

      {/* Options Actions Sheet Menu */}
      <MoreOptionsMenu
        workerId={worker.id}
        workerName={worker.name}
        isVisible={optionsVisible}
        onClose={handleCloseOptions}
        onReport={handleReport}
        onBlock={handleBlock}
        onShare={handleShare}
      />

      <ImageViewer
        images={portfolioImages}
        initialIndex={viewerStartIndex}
        isVisible={viewerVisible}
        onClose={() => setViewerVisible(false)}
      />

      {worker && (
        <BlockWorkerSheet
          visible={blockSheetVisible}
          workerId={worker.id}
          workerName={worker.name}
          hasActiveBooking={hasActiveBooking}
          onClose={() => setBlockSheetVisible(false)}
          onBlock={async (workerId, reason) => {
            await blockWorkerMutation.mutateAsync({ workerId, reason });
          }}
          isLoading={blockWorkerMutation.isPending}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bgCard,
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bgCard,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingNav: {
    paddingHorizontal: 10,
    paddingTop: 8,
    marginBottom: 12,
  },
  loadingBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonTitle: {
    marginBottom: 6,
  },
  contentCard: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
  },
  statsCard: {
    marginTop: GROUP_GAP,
  },
  section: {
    marginTop: SECTION_GAP,
  },
  // Lets the portfolio grid span edge to edge; it re-applies the gutter internally.
  fullBleed: {
    marginHorizontal: -SCREEN_PADDING,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  emptyText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 4,
  },
  reviewList: {
    marginTop: 4,
  },
  customQuoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.bgSection,
  },
  pressed: {
    backgroundColor: colors.bgHover,
  },
  customQuoteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  customQuoteTextCol: {
    flex: 1,
  },
  customQuoteTitle: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  customQuoteSubtitle: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 20,
  },
});
