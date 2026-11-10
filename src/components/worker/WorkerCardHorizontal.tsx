import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ViewStyle, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Star, ShieldCheck, Heart, MapPin } from 'lucide-react-native';

import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { usePressScale } from '../../hooks/usePressScale';
import { useCustomerCoords } from '../../hooks/useCustomerCoords';
import { resolveWorkerDistance } from '../../utils/locationUtils';
import { pushOnce } from '../../utils/navigationGuard';
import { prefetchWorkerProfile } from '../../hooks/useWorkerProfile';
import { WorkerNearby } from '../../types/worker.types';
import { WorkerAvatar } from './WorkerAvatar';
import { useFavoritesStore } from '../../store/favorites.store';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

export interface WorkerCardHorizontalProps {
  worker: WorkerNearby;
  cardWidth?: number;
  onBookNow?: (worker: WorkerNearby) => void;
  style?: ViewStyle;
}

export const WorkerCardHorizontal = memo<WorkerCardHorizontalProps>(({
  worker,
  cardWidth,
  onBookNow,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();

  // Reduced card width (~72% of screen width) while keeping full original height
  const defaultCardWidth = windowWidth
    ? Math.min(Math.round(windowWidth * 0.72), 300)
    : 280;
  const finalWidth = cardWidth || defaultCardWidth;

  // Favorites state
  const isFav = useFavoritesStore((state) => state.isFavorite(worker.id));
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  // Animations
  const card = usePressScale(0.985);
  const book = usePressScale(0.97);
  const prefetch = () => prefetchWorkerProfile(queryClient, worker.id);
  const heartScale = useSharedValue(1);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const openProfile = () => pushOnce(() => router.push(`/worker/${worker.id}` as any));

  const handleFavoriteToggle = () => {
    // Subtle confirmation: quick dip then settle, no overshoot.
    heartScale.value = 0.85;
    heartScale.value = withTiming(1, { duration: 140 });
    toggleFavorite(worker.id);
  };

  const handleBookPress = () => {
    if (onBookNow) {
      onBookNow(worker);
    } else {
      openProfile();
    }
  };

  const isOnline = worker.availabilityStatus === 'AVAILABLE';
  const profession = worker.categories?.[0] || 'Professional Service';
  const ratingValue = worker.avgRating > 0 ? worker.avgRating.toFixed(1) : '5.0';
  const reviewCount = worker.totalReviews || 0;
  // Real measurement only: customer coords vs worker coords. Hidden when unknown (never a default).
  const customerCoords = useCustomerCoords();
  const distance = useMemo(
    () => resolveWorkerDistance(worker, customerCoords).distanceLabel,
    [worker.id, worker.distanceMeters, worker.lat, worker.lng, customerCoords]
  );
  const currency = worker.currency === 'Rs' ? 'PKR' : (worker.currency || 'PKR');

  return (
    <AnimatedPressable
      onPress={openProfile}
      onPressIn={() => {
        card.onPressIn();
        prefetch();
      }}
      onPressOut={card.onPressOut}
      style={[
        styles.container,
        { width: finalWidth },
        card.animatedStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${worker.name}, ${profession}`}
    >
      {/* ── Primary Content Group: Avatar, Identity & Metadata ── */}
      <View style={styles.mainContent}>
        {/* Top Area: Avatar (top-left) & Minimal Heart Icon (top-right) */}
        <View style={styles.topArea}>
          {/* Circular Profile Image with Online Indicator */}
          <WorkerAvatar
            uri={worker.avatarUrl || (worker as any)?.avatar || (worker as any)?.avatar_url}
            name={worker.name}
            size={56}
            showOnlineBadge={true}
            isOnline={isOnline}
            badgeSize={14}
          />

          {/* Minimal Heart Outline Icon in Top-Right */}
          <Pressable
            onPress={handleFavoriteToggle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.favoriteButton}
            accessibilityRole="button"
            accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Animated.View style={heartAnimatedStyle}>
              <Heart
                size={20}
                color={isFav ? '#EF4444' : colors.textMuted}
                fill={isFav ? '#EF4444' : 'transparent'}
                strokeWidth={1.8}
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* Worker Information: Name, Profession & Metadata Row */}
        <View style={styles.infoArea}>
          {/* Worker Name in bold, dark, high-contrast typography */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {worker.name}
            </Text>
            <ShieldCheck size={15} color={colors.primary} style={styles.verifiedIcon} />
          </View>

          {/* Profession/Category in a softer secondary gray color */}
          <Text style={styles.profession} numberOfLines={1}>
            {profession}
          </Text>

          {/* Compact Metadata Row: ⭐ Star + rating, (reviews), dot, location/distance */}
          <View style={styles.metaRow}>
            <Star size={13} color="#F59E0B" fill="#F59E0B" style={styles.starIcon} />
            <Text style={styles.ratingText}>{ratingValue}</Text>
            <Text style={styles.reviewsText}>({reviewCount})</Text>
            {distance ? (
              <>
                <Text style={styles.separatorDot}>•</Text>
                <MapPin size={12} color={colors.textMuted} style={styles.mapPinIcon} />
                <Text style={styles.distanceText} numberOfLines={1}>
                  {distance}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Bottom Action Row: Two-Column Layout (Pricing Left, Mint CTA Right) ── */}
      <View style={styles.bottomRow}>
        {/* Left Side — Pricing */}
        <View style={styles.priceContainer}>
          {worker.startingPrice ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>{currency} </Text>
              <Text style={styles.priceAmount}>{worker.startingPrice}</Text>
              <Text style={styles.priceUnit}> /hr</Text>
            </View>
          ) : (
            <Text style={styles.priceCustom} numberOfLines={1}>Custom Quote</Text>
          )}
        </View>

        {/* Right Side — Subtle Mint Pill "Book Now" CTA with Accessible Touch Target */}
        <AnimatedPressable
          onPress={handleBookPress}
          onPressIn={() => {
            book.onPressIn();
            prefetch();
          }}
          onPressOut={book.onPressOut}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={[styles.bookButton, book.animatedStyle]}
          accessibilityRole="button"
          accessibilityLabel={`Book ${worker.name} now`}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
});

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    height: 228,
    justifyContent: 'space-between',
    ...shadows.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  mainContent: {
    width: '100%',
  },
  topArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    backgroundColor: colors.bgSection,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.bgCard,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoArea: {
    marginTop: 10,
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15.5,
    color: colors.textPrimary,
    lineHeight: 21,
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  profession: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  starIcon: {
    marginRight: 3,
  },
  ratingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  reviewsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 3,
  },
  separatorDot: {
    color: colors.textDisabled,
    marginHorizontal: 6,
    fontSize: 11,
  },
  mapPinIcon: {
    marginRight: 3,
  },
  distanceText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  priceContainer: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.primaryDark,
  },
  priceAmount: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: colors.primaryDark,
  },
  priceUnit: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  priceCustom: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: colors.primaryDark,
  },
  bookButton: {
    backgroundColor: colors.primaryTint, // subtle mint tint
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.22)', // Delicate mint border
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  bookButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: palette.green800, // Dark green text with medium-bold typography
    letterSpacing: 0.1,
  },
});
