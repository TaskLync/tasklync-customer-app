import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Share, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkerProfile } from '@hooks/useWorkerProfile';
import { useWorkerReviews } from '@hooks/useWorkerReviews';
import { useWorkerPortfolio } from '@hooks/useWorkerPortfolio';
import { WorkerProfileHeader } from '@components/worker/WorkerProfileHeader';
import { WorkerCompactHeader } from '@components/worker/WorkerCompactHeader';
import { WorkerAvailabilityCard } from '@components/worker/WorkerAvailabilityCard';
import { WorkerStats } from '@components/worker/WorkerStats';
import { WorkerBio } from '@components/worker/WorkerBio';
import { WorkerSkillList } from '@components/worker/WorkerSkillList';
import { WorkerServicesSection } from '@components/worker/WorkerServicesSection';
import { WorkerProfileStickyFooter } from '@components/worker/WorkerProfileStickyFooter';
import { MoreOptionsMenu } from '@components/worker/MoreOptionsMenu';
import { WorkerPortfolioGrid } from '@components/worker/WorkerPortfolioGrid';
import { ReviewSummary } from '@components/review/ReviewSummary';
import { ReviewCard, REVIEW_CARD_GAP } from '@components/review/ReviewCard';
import { SectionDivider } from '@components/ui/Divider';
import { ImageViewer } from '@components/common/ImageViewer';
import { BlockWorkerSheet } from '../../src/components/worker/BlockWorkerSheet';
import { useBlockWorker } from '../../src/hooks/useBlockWorker';
import { getPersistedBookings } from '../../src/services/api/booking.api';
import { ChevronRight } from 'lucide-react-native';

import {
  SkeletonWorkerProfileHero,
  SkeletonWorkerStats,
  SkeletonWorkerBio,
  SkeletonWorkerSkillList,
  SkeletonWorkerServiceRow,
  SkeletonReviewSummary,
  SkeletonPortfolioGrid,
  SkeletonReviewCard,
} from '@components/ui/Skeleton';

import { colors } from '@design/colors';
import { typography } from '@design/typography';
import { EmptyState } from '../../src/components/feedback/EmptyState';

// Spacing system: 20 screen gutter · 16 within a group · 24 between sections.
const SCREEN_PADDING = 20;
const GROUP_GAP = 16;
const SECTION_GAP = 24;
// Header already has its own bottom padding; this adds the visible gap below it.
const HEADER_CONTENT_GAP = 12;
// Clearance for the floating footer (Chat / Book Now).
const FOOTER_CLEARANCE = 112;

export default function WorkerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // Dynamic clearance for the floating footer (Chat / Book Now) accounting for Android edge-to-edge system navigation
  const dynamicFooterClearance = Math.max(
    FOOTER_CLEARANCE,
    72 + (insets.bottom > 0 ? insets.bottom + 14 : 20) + 16
  );
  
  const scrollY = useSharedValue(0);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [blockSheetVisible, setBlockSheetVisible] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const blockWorkerMutation = useBlockWorker();

  const { worker, skills, services, isLoading, isError, refetch } = useWorkerProfile(id || '');
  const { reviews: previewReviews, summary } = useWorkerReviews(id || '');
  const { images: portfolioImages } = useWorkerPortfolio(id || '');

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
    try {
      await Share.share({
        message: `Check out ${worker.name} on Tasklync! Providing expert home services.`,
        url: `https://tasklync.com/worker/${worker.id}`,
      });
    } catch (error) {
      console.error('Error sharing profile', error);
    }
  };

  const handleMore = () => {
    setOptionsVisible(true);
  };

  const handleCloseOptions = () => {
    setOptionsVisible(false);
  };

  const handleReport = () => {
    setOptionsVisible(false);
    Alert.alert('Report Worker', 'Thank you for reporting. Our safety team will review this profile immediately.');
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
      Alert.alert(
        'Direct Chat',
        `Direct chat with ${worker?.name || 'this worker'} is enabled once you book a service.`
      );
    }
  };

  const handleBookNow = () => {
    Alert.alert('Book Now', `Proceed to checkout with ${worker?.name || 'worker'}?`);
  };

  const handleRatingPress = () => {
    router.push(`/worker/${id}/reviews`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonWorkerProfileHero />
          <View style={styles.contentCard}>
            <SkeletonWorkerStats />
            <View style={styles.sectionSpacer} />
            <SkeletonWorkerBio />
            <View style={styles.sectionSpacer} />
            <SkeletonWorkerSkillList />
            <View style={styles.sectionSpacer} />
            <View style={styles.servicesHeaderSkeleton}>
              <SkeletonWorkerServiceRow />
              <SkeletonWorkerServiceRow />
            </View>
            <View style={styles.sectionSpacer} />
            <SkeletonPortfolioGrid />
            <View style={styles.sectionSpacer} />
            <SkeletonReviewSummary />
            <View style={styles.reviewList}>
              <SkeletonReviewCard />
              <SkeletonReviewCard />
            </View>
          </View>
        </ScrollView>
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
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
        {/* Parallax Hero Header */}
        <WorkerProfileHeader
          worker={worker}
          scrollY={scrollY}
          onBack={handleBack}
          onShare={handleShare}
          onMore={handleMore}
        />

        {/* Content Card Overlapping Hero */}
        <View style={[styles.contentCard, { paddingBottom: dynamicFooterClearance }]}>
          {/* Trust Row: Availability card */}
          <View style={styles.trustRow}>
            <WorkerAvailabilityCard
              status={worker.availabilityStatus}
              availableUntil={worker.availableUntil}
              avgResponseMins={worker.responseTimeMins}
            />
          </View>

          {/* Stats Grid */}
          <WorkerStats
            rating={worker.avgRating}
            totalReviews={worker.totalReviews}
            totalJobs={worker.totalBookings}
            avgResponseMins={worker.responseTimeMins}
            onRatingPress={handleRatingPress}
            style={styles.statsCard}
          />
          
          <View style={styles.divider} />

          {/* About Bio */}
          <WorkerBio bio={worker.bio} style={styles.bioSection} />

          <View style={styles.divider} />

          {/* Skills Tag Cloud */}
          <WorkerSkillList skills={skills} style={styles.skillsSection} />

          <View style={styles.divider} />

          {/* Services Rows list */}
          <WorkerServicesSection
            services={services}
            workerId={worker.id}
            workerName={worker.name}
            workerAvatar={worker.avatarUrl}
            workerRating={worker.avgRating}
            workerCategory={worker.categories?.[0]}
            workerVerified={worker.isVerified}
            startingPrice={worker.startingPrice}
            style={styles.servicesSection}
          />

          <Pressable
            style={styles.customQuoteRow}
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
            <Text style={styles.customQuoteTitle}>Request a custom quote</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>

          <SectionDivider marginV={8} />

          <WorkerPortfolioGrid
            images={portfolioImages.slice(0, 6)}
            workerId={worker.id}
            maxVisible={6}
            onViewAll={() => router.push(`/worker/${id}/portfolio`)}
            onImagePress={(images, index) => {
              setViewerStartIndex(index);
              setViewerVisible(true);
            }}
            showHeader={true}
          />

          <SectionDivider marginV={8} />

          <ReviewSummary
            summary={summary}
            onViewAll={() => router.push(`/worker/${id}/reviews`)}
          />

          {previewReviews.length > 0 && (
            <View style={styles.reviewList}>
              {previewReviews.slice(0, 3).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showReply={true}
                  maxCommentLines={3}
                />
              ))}

              {summary && (summary.totalReviews ?? (summary as any).total ?? 0) > 3 && (
                <Pressable
                  onPress={() => router.push(`/worker/${id}/reviews`)}
                  hitSlop={12}
                  style={styles.seeAllLink}
                >
                  <Text style={styles.seeAllText}>
                    See all {summary.totalReviews ?? (summary as any).total} reviews →
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Floating Action Sticky Footer */}
      <WorkerProfileStickyFooter
        workerId={worker.id}
        workerName={worker.name}
        onChat={handleChat}
        onBookNow={handleBookNow}
        isWorkerAvailable={isAvailable}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentCard: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: SCREEN_PADDING,
    // Clear breathing room between the worker header and the first content block.
    paddingTop: HEADER_CONTENT_GAP,
    // Keeps the last section clear of the floating footer without a fixed spacer view.
    paddingBottom: FOOTER_CLEARANCE,
  },
  trustRow: {
    marginBottom: GROUP_GAP,
    width: '100%',
  },
  statsCard: {
    marginBottom: GROUP_GAP,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: SECTION_GAP,
    width: '100%',
  },
  bioSection: {
    width: '100%',
  },
  skillsSection: {
    width: '100%',
  },
  servicesSection: {
    width: '100%',
  },
  reviewList: {
    marginTop: 8,
    gap: REVIEW_CARD_GAP,
  },
  seeAllLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  seeAllText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  sectionSpacer: {
    height: SECTION_GAP,
  },
  customQuoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 8,
  },
  customQuoteTitle: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primaryDark,
  },

  servicesHeaderSkeleton: {
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 20,
  },
  errorText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  errorSubtext: {
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});
