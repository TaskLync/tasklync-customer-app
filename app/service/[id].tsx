import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Droplet,
  Wind,
  Sparkles,
  Hammer,
  Paintbrush,
  Wrench,
  User,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '@design/colors';
import { typography } from '@design/typography';
import { radius } from '@design/radius';
import { shadows } from '@design/shadows';
import { useServiceById } from '@hooks/useServiceById';
import { useNearbyWorkers } from '@hooks/useNearbyWorkers';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { ErrorState } from '@components/feedback/ErrorState';
import { ServicePriceTag } from '@components/service/ServicePriceTag';
import { AddToCartButton } from '@components/cart/AddToCartButton';
import { Chip } from '@components/ui/Chip/Chip';
import { WorkerNearby } from '../../src/types/worker.types';
import { WorkerAvatar } from '../../src/components/worker/WorkerAvatar';
import { OnlineBadge } from '@components/ui/Badge/OnlineBadge';
import { getServicePrice } from '../../src/utils/formatters';

const HERO_HEIGHT = 240;

const CATEGORY_STYLE_MAP: Record<string, { bg: string; color: string; Icon: any }> = {
  electrician: { bg: palette.amber100, color: colors.warningMedium, Icon: Zap },
  plumber: { bg: colors.infoLight, color: colors.textInfo, Icon: Droplet },
  ac_repair: { bg: palette.sky50, color: palette.sky600, Icon: Wind },
  cleaning: { bg: colors.primaryTint, color: colors.primaryDark, Icon: Sparkles },
  carpenter: { bg: palette.orange50, color: palette.orange600, Icon: Hammer },
  painter: { bg: palette.purple50, color: palette.purple400, Icon: Paintbrush },
};

const DEFAULT_STYLE = { bg: colors.bgHover, color: colors.textSecondary, Icon: Wrench };

export default function ServiceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, workerId } = useLocalSearchParams<{ id: string; workerId?: string }>();

  const { isOffline } = useNetworkStatus();
  // Fetch data
  const { service, isLoading: isServiceLoading, isError, refetch } = useServiceById(id || '');
  const { workers, isLoading: isWorkersLoading } = useNearbyWorkers(
    service?.categoryId ? { category: service.categoryId } : {}
  );

  const [selectedWorker, setSelectedWorker] = useState<WorkerNearby | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  // Set initial pre-selected worker if passed from search/profile context
  useEffect(() => {
    if (workerId && workers.length > 0) {
      const found = workers.find((w) => w.id === workerId);
      if (found) setSelectedWorker(found);
    }
  }, [workerId, workers]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/' as any);
    }
  };

  const handleSelectWorker = (worker: WorkerNearby) => {
    setSelectedWorker(worker);
  };

  const handleScrollToWorkers = () => {
    // Simple scrolling to the workers section (approx 460px down)
    scrollRef.current?.scrollTo({ y: 460, animated: true });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animated styles for fading header
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      scrollY.value,
      [0, 160],
      ['rgba(250, 250, 250, 0)', 'rgba(250, 250, 250, 1)']
    );
    const borderBottomColor = interpolateColor(
      scrollY.value,
      [160, 200],
      ['rgba(226, 232, 240, 0)', 'rgba(226, 232, 240, 1)']
    );
    return {
      backgroundColor,
      borderBottomColor,
      borderBottomWidth: scrollY.value > 160 ? 1 : 0,
    };
  });

  const headerTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [140, 200],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  if (isServiceLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (isError || !service) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top,
              backgroundColor: colors.bgApp,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { opacity: 1 }]}>Service Details</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <ErrorState
          type={isOffline ? 'offline' : 'error'}
          title={isOffline ? 'No internet connection' : 'Service unavailable'}
          subtitle={
            isOffline
              ? 'Please check your connection or Wi-Fi settings and try again.'
              : "We couldn't load details for this service. Please try again."
          }
          onRetry={() => refetch()}
          retryButtonText="Retry"
        />
      </View>
    );
  }

  const catStyle = CATEGORY_STYLE_MAP[service.categoryId] || DEFAULT_STYLE;
  const CategoryIcon = catStyle.Icon;

  const inclusions = (service as any).includes || [
    'Complete installation or replacement labor',
    'Post-work testing and performance evaluation',
    '30-day post-service quality assurance guarantee',
    'Certified, background-verified professional service',
  ];

  const exclusions = (service as any).excludes || [
    'Additional wiring or conduit channels (charged extra)',
    'Premium switches, regulators or specialized cosmetics',
    'Structural masonry repairs or architectural work',
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Floating Header */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 10) },
          headerAnimatedStyle,
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={8}
        >
          <ChevronLeft
            size={24}
            color={colors.primary}
          />
        </Pressable>
        <Animated.Text style={[styles.headerTitle, headerTitleAnimatedStyle]}>
          {service.name}
        </Animated.Text>
        <View style={styles.headerRightPlaceholder} />
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={[styles.hero, { backgroundColor: catStyle.bg }]}>
          <CategoryIcon
            size={72}
            color={catStyle.color}
          />
        </View>

        {/* Content Details */}
        <View style={styles.cardContent}>
          {/* Breadcrumb */}
          <Text style={styles.breadcrumb}>
            {service.categoryId.replace('_', ' ').toUpperCase()} &gt; INSTALLATION
          </Text>

          {/* Service Name */}
          <Text style={styles.serviceName}>{service.name}</Text>

          {/* Price & Duration Row */}
          <View style={styles.priceRow}>
            <ServicePriceTag
              amount={getServicePrice(service, 500)}
              priceType={service.priceType}
              size="lg"
            />
            <Chip
              label={`~${service.minDurationMins || 60} mins`}
              variant="tag"
              size="sm"
              icon={Clock}
              style={styles.durationChip}
            />
          </View>

          <View style={styles.divider} />

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this service</Text>
            <Text
              style={styles.bodyText}
              numberOfLines={descriptionExpanded ? undefined : 5}
            >
              {service.description ||
                'This professional service is handled by our vetted partners. We ensure the highest standard of workmanship, punctuality, and cleanliness. Our services are fully insured and backed by Tasklync warranty protection.'}
            </Text>
            {service.description && service.description.length > 200 && (
              <Pressable
                onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                style={styles.readMoreBtn}
              >
                <Text style={styles.readMoreTxt}>
                  {descriptionExpanded ? 'Read Less' : 'Read More'}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.divider} />

          {/* Inclusions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's included</Text>
            {inclusions.map((inc: string, index: number) => (
              <View
                key={`inc-${index}`}
                style={styles.bulletRow}
              >
                <CheckCircle2
                  size={16}
                  color={colors.primary}
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{inc}</Text>
              </View>
            ))}
          </View>

          {/* Exclusions */}
          {exclusions.length > 0 && (
            <View style={[styles.section, { marginTop: 16 }]}>
              <Text style={styles.sectionTitle}>What's NOT included</Text>
              {exclusions.map((exc: string, index: number) => (
                <View
                  key={`exc-${index}`}
                  style={styles.bulletRow}
                >
                  <XCircle
                    size={16}
                    color={colors.textDanger}
                    style={styles.bulletIcon}
                  />
                  <Text style={styles.bulletText}>{exc}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Workers Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Workers offering this</Text>
              <Text style={styles.seeAllText}>Near You</Text>
            </View>

            {isWorkersLoading ? (
              <Text style={styles.loadingText}>Finding nearby workers...</Text>
            ) : workers.length === 0 ? (
              <Text style={styles.emptyText}>No workers nearby for this service right now.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.workersCarousel}
              >
                {workers.map((worker) => {
                  const isSelected = selectedWorker?.id === worker.id;
                  return (
                    <Pressable
                      key={worker.id}
                      onPress={() => handleSelectWorker(worker)}
                      style={[
                        styles.workerCard,
                        isSelected && styles.workerCardSelected,
                      ]}
                    >
                      <WorkerAvatar
                          uri={worker.avatarUrl || (worker as any)?.avatar || (worker as any)?.avatar_url}
                          name={worker.name}
                          size={48}
                          showOnlineBadge={true}
                          isOnline={worker.availabilityStatus === 'AVAILABLE'}
                          badgeSize={10}
                        />

                      <Text
                        style={styles.workerName}
                        numberOfLines={1}
                      >
                        {worker.name}
                      </Text>

                      <View style={styles.workerRatingRow}>
                        <Text style={styles.workerStar}>⭐</Text>
                        <Text style={styles.workerRating}>{worker.avgRating.toFixed(1)}</Text>
                      </View>

                      <Text style={styles.workerPrice}>
                        Rs {worker.startingPrice || 500}
                      </Text>

                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Text style={styles.selectedText}>Selected</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Bottom spacing for footer clearance */}
          <View style={{ height: 108 + insets.bottom }} />
        </View>
      </Animated.ScrollView>

      {/* Sticky Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
        ]}
      >
        {selectedWorker ? (
          <View style={styles.footerBookingRow}>
            <View style={styles.selectedWorkerInfo}>
              <WorkerAvatar
                uri={selectedWorker.avatarUrl || (selectedWorker as any)?.avatar || (selectedWorker as any)?.avatar_url}
                name={selectedWorker.name}
                size={40}
              />
              <View>
                <Text
                  style={styles.footerWorkerName}
                  numberOfLines={1}
                >
                  {selectedWorker.name}
                </Text>
                <Pressable
                  onPress={() => setSelectedWorker(null)}
                  hitSlop={8}
                >
                  <Text style={styles.changeWorkerLink}>Change worker</Text>
                </Pressable>
              </View>
            </View>

            <AddToCartButton
              serviceId={service.id}
              serviceName={service.name}
              price={getServicePrice(service, 500)}
              workerId={selectedWorker.id}
              workerName={selectedWorker.name}
              workerAvatar={selectedWorker.avatarUrl}
              workerRating={selectedWorker.avgRating}
              workerCategory={(selectedWorker as any).category || selectedWorker.categories?.[0] || service.categoryId}
              size="md"
            />
          </View>
        ) : (
          <Pressable
            onPress={handleScrollToWorkers}
            style={styles.selectWorkerCTA}
          >
            <User
              size={18}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.selectWorkerCTAText}>Select a Worker to Book</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgApp,
  },
  loadingText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    minHeight: 56,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    backgroundColor: colors.bgApp,
  },
  hero: {
    height: HERO_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  breadcrumb: {
    fontFamily: typography.fontFamily.jakarta.bold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  serviceName: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationChip: {
    backgroundColor: colors.bgSection,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  readMoreBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  readMoreTxt: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  seeAllText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  workersCarousel: {
    gap: 12,
    paddingVertical: 4,
  },
  workerCard: {
    width: 110,
    padding: 10,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  workerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  workerAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  workerOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  workerName: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  workerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  workerStar: {
    fontSize: 10,
    marginRight: 2,
  },
  workerRating: {
    fontFamily: typography.fontFamily.inter.semiBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  workerPrice: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: 11,
    color: colors.primary,
    marginTop: 4,
  },
  selectedIndicator: {
    marginTop: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedText: {
    fontFamily: typography.fontFamily.jakarta.bold,
    fontSize: 9,
    color: colors.white,
  },
  emptyText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  selectWorkerCTA: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectWorkerCTAText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  footerBookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedWorkerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  footerWorkerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  footerWorkerName: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    maxWidth: 100,
  },
  changeWorkerLink: {
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
