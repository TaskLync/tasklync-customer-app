import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Star,
  MapPin,
  Building2,
  MessageSquare,
  BadgeCheck,
} from 'lucide-react-native';

import { useWorkerProfile } from '../../src/hooks/useWorkerProfile';
import { useWorkerReviews } from '../../src/hooks/useWorkerReviews';
import { WorkerPublicProfile, WorkerServiceOffering } from '../../src/types/worker.types';
import { CompanyServiceRow } from '../../src/components/company/CompanyServiceRow';
import { ReviewCard } from '../../src/components/review/ReviewCard';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { SkeletonCompanyProfile } from '../../src/components/company/SkeletonCompanyProfile';
import { getPersistedBookings } from '../../src/services/api/booking.api';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';

const PAGE_PADDING = 20;
const ICON_BUTTON = 44;
const REVIEWS_PREVIEW_COUNT = 3;

// Neutral review card override: flat, separated by hairlines instead of nested cards.
const flatReviewStyle = {
  backgroundColor: 'transparent',
  borderWidth: 0,
  borderRadius: 0,
  paddingHorizontal: 0,
  paddingVertical: 16,
  shadowOpacity: 0,
  elevation: 0,
} as const;

export default function CompanyDetailScreen() {
  const { companyTokens } = useAppTheme();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const { worker, services, isLoading: isProfileLoading } = useWorkerProfile(id || '');
  const { reviews, summary } = useWorkerReviews(id || '');

  const company: WorkerPublicProfile | null = useMemo(() => {
    // This route is only reached from company listings. The profile endpoint may not
    // echo provider_type, so a strict flag check wrongly rejected valid companies.
    // Accept any loaded profile; only a missing profile is "not found".
    return worker ?? null;
  }, [worker]);

  const activeServices: WorkerServiceOffering[] = useMemo(() => {
    if (services && services.length > 0) return services;
    return company?.serviceOfferings ?? [];
  }, [services, company]);

  // Single source of truth for rating: review service summary first, then profile aggregate.
  // Guards against "0 reviews" in the header while reviews are listed below.
  const reviewTotal = Math.max(
    summary?.totalReviews ?? 0,
    company?.totalReviews ?? 0,
    reviews.length
  );
  const reviewAverage =
    summary && summary.avgRating > 0
      ? summary.avgRating
      : company && company.avgRating > 0 && reviewTotal > 0
      ? company.avgRating
      : 0;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/' as any);
    }
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!company) return;
    try {
      await Share.share({
        message: `Check out ${company.business_name || company.name} on TaskLync.`,
        url: `https://tasklync.pk/company/${company.id}`,
      });
    } catch (err) {
      console.warn('Error sharing company profile:', err);
    }
  }, [company]);

  const handleChatSupport = useCallback(() => {
    const existing = getPersistedBookings().find(
      (b) =>
        b.worker_id === id &&
        (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS' || b.status === 'PENDING')
    );
    if (existing) {
      router.push({
        pathname: `/booking/${existing.id}/chat`,
        params: {
          workerName: company?.business_name || company?.name || existing.worker_name,
          workerAvatar: company?.avatarUrl || existing.worker_avatar_url,
          workerPhone: (company as any)?.phone || existing.worker_phone,
          workerId: company?.id || existing.worker_id,
        },
      } as any);
    } else {
      showAlert(
        'Message agency',
        `Chat with ${company?.business_name || 'this agency'} opens once you request a booking.`
      );
    }
  }, [company, id, router]);

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={colors.textPrimary} />
      </Pressable>
      {company ? (
        <View style={styles.topBarRight}>
          <Pressable
            onPress={handleChatSupport}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Message agency"
          >
            <MessageSquare size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Share company profile"
          >
            <Share2 size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (isProfileLoading && !company) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedStatusBar />
        {renderTopBar()}
        <SkeletonCompanyProfile />
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedStatusBar />
        {renderTopBar()}
        <View style={styles.centered}>
          <EmptyState
            title="Company not found"
            subtitle="This service company is unavailable or has moved."
            actionLabel="Browse all companies"
            onAction={() => router.replace('/company' as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = company.business_name || company.name;
  const description = company.bio?.trim() || '';
  const isVerified = company.verificationStatus === 'VERIFIED' || company.isVerified === true;
  const hasRating = reviewTotal > 0 && reviewAverage > 0;
  const city = company.city?.trim();
  const showSeeAll = reviewTotal > REVIEWS_PREVIEW_COUNT;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />
      {renderTopBar()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* ── Identity ── */}
        <View style={styles.identityRow}>
          <View style={styles.logo}>
            {company.avatarUrl && !logoError ? (
              <Image
                source={{ uri: company.avatarUrl }}
                style={styles.logoImage}
                contentFit="cover"
                onError={() => setLogoError(true)}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Building2 size={26} color={colors.textMuted} />
            )}
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={2}>
              {displayName}
            </Text>
            {isVerified ? (
              <View style={styles.verifiedRow}>
                <BadgeCheck size={15} color={colors.primary} />
                <Text style={styles.verifiedText}>Verified agency</Text>
              </View>
            ) : null}
            {hasRating || city ? (
              <View style={styles.metaRow}>
                {hasRating ? (
                  <View
                    style={styles.fact}
                    accessible
                    accessibilityLabel={`Rated ${reviewAverage.toFixed(1)} from ${reviewTotal} ${
                      reviewTotal === 1 ? 'review' : 'reviews'
                    }`}
                  >
                    <Star
                      size={13}
                      color={companyTokens.colors.ratingGold}
                      fill={companyTokens.colors.ratingGold}
                    />
                    <Text style={styles.factText}>
                      <Text style={styles.factStrong}>{reviewAverage.toFixed(1)}</Text>
                      {` (${reviewTotal})`}
                    </Text>
                  </View>
                ) : null}
                {city ? (
                  <View style={[styles.fact, styles.cityFact]}>
                    <MapPin size={13} color={colors.textMuted} />
                    <Text style={styles.factText} numberOfLines={1}>
                      {city}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* ── About ── */}
        {description ? (
          <View style={styles.about}>
            <Text style={styles.bodyText} numberOfLines={descriptionExpanded ? undefined : 3}>
              {description}
            </Text>
            {description.length > 120 ? (
              <Pressable
                onPress={() => setDescriptionExpanded((v) => !v)}
                hitSlop={8}
                style={styles.textButton}
                accessibilityRole="button"
                accessibilityLabel={descriptionExpanded ? 'Show less' : 'Read more'}
              >
                <Text style={styles.textButtonLabel}>
                  {descriptionExpanded ? 'Show less' : 'Read more'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ── Services ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {activeServices.length > 0 ? (
            <View>
              {activeServices.map((service, index) => (
                <CompanyServiceRow
                  key={service.id}
                  service={service}
                  workerId={company.id}
                  workerName={displayName}
                  workerAvatar={company.avatarUrl}
                  workerRating={reviewAverage || undefined}
                  workerCategory={company.categories?.[0] || 'Services'}
                  workerVerified={isVerified}
                  showDivider={index > 0}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No services listed yet.</Text>
          )}

          {/* Custom quote: secondary action closing the services list */}
          <Pressable
            style={({ pressed }) => [styles.customQuoteRow, pressed && styles.pressed]}
            onPress={() =>
              router.push({
                pathname: '/custom-request/new' as any,
                params: {
                  workerId: company.id,
                  categoryId: company.categories?.[0] || '',
                  providerType: 'COMPANY',
                },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Request a custom quote from ${displayName}`}
          >
            <Text style={styles.customQuoteTitle}>Need something else? Request a custom quote</Text>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* ── Reviews (only when real reviews exist) ── */}
        {reviews.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {showSeeAll ? (
                <Pressable
                  onPress={() => router.push(`/worker/${company.id}/reviews` as any)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`See all ${reviewTotal} reviews`}
                >
                  <Text style={styles.textButtonLabel}>See all</Text>
                </Pressable>
              ) : null}
            </View>
            <View>
              {reviews.slice(0, REVIEWS_PREVIEW_COUNT).map((review, index) => (
                <View key={review.id} style={index > 0 && styles.reviewDivider}>
                  <ReviewCard review={review} style={flatReviewStyle} />
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, companyTokens }: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAGE_PADDING - 10,
    height: 56,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ICON_BUTTON / 2,
  },
  pressed: {
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 8,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginTop: 4,
  },
  cityFact: {
    flexShrink: 1,
  },
  about: {
    marginTop: 16,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  factText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },
  factStrong: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.textPrimary,
  },
  section: {
    marginTop: 24,
  },
  customQuoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: companyTokens.colors.borderSubtle,
  },
  customQuoteTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    flex: 1,
    fontSize: 13,
    color: colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  textButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    minHeight: 24,
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  reviewDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: companyTokens.colors.borderSubtle,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
