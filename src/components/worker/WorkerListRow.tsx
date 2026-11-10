import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Star } from 'lucide-react-native';
import { WorkerNearby } from '../../types/worker.types';
import { typography } from '../../design/typography';
import { pushOnce } from '../../utils/navigationGuard';
import { prefetchWorkerProfile } from '../../hooks/useWorkerProfile';
import { useCustomerCoords } from '../../hooks/useCustomerCoords';
import { resolveWorkerDistance } from '../../utils/locationUtils';
import { WorkerAvatar } from './WorkerAvatar';
import { CompanyBadge } from '../company/CompanyBadge';
import { OfferBadge } from '../offers/OfferBadge';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from '../ui/Skeleton/Skeleton';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

// ─── Layout tokens (shared with the skeleton so loading → loaded never jumps) ──
const GUTTER = 16;
const AVATAR = 48;
const AVATAR_GAP = 12;
/** Separator starts under the text column, menu-list style. */
export const WORKER_ROW_SEPARATOR_INSET = GUTTER + AVATAR + AVATAR_GAP;

interface WorkerListRowProps {
  worker: WorkerNearby;
  /** Hide the bottom separator on the last row. */
  isLast?: boolean;
}

const formatPrice = (amount: number) => amount.toLocaleString('en-US');

/**
 * Menu-style worker row for directory lists.
 *   [avatar•]  Name ✓                     Starts at
 *              Category                    Rs 1,500
 *              ★ 4.8 (42) · 1.4 km · ~12 min
 * Every value comes from the backend; missing data is omitted, never invented.
 */
const WorkerListRowBase: React.FC<WorkerListRowProps> = ({ worker, isLast = false }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();

  const isCompany = Boolean(worker.isCompany || worker.providerType === 'COMPANY');
  const displayName = (isCompany ? worker.businessName || worker.name : worker.name) || 'Worker';
  // Companies are verified on their registration documents, individuals on their own profile.
  const isVerified = isCompany ? Boolean(worker.companyVerified) : Boolean(worker.isVerified);

  // ── Availability: only real-time signals are surfaced ──
  const isBusy = Boolean(worker.isBusy || worker.isOnJob);
  const isOnline =
    !isBusy && Boolean(worker.hasLiveAvailability) && worker.availabilityStatus === 'AVAILABLE';

  // ── Category: primary first, overflow summarised ──
  const categories = (worker.categories || []).filter(Boolean);
  const categoryLabel =
    categories.length > 1 ? `${categories[0]} +${categories.length - 1}` : categories[0] || null;

  // ── Rating: never show 0.0 / (0) ──
  const reviews = Number(worker.totalReviews) || 0;
  const rating = Number(worker.avgRating) || 0;
  const hasRating = reviews > 0 && rating > 0;

  // ── Distance: only a real measurement, not the "Nearby" fallback ──
  const customerCoords = useCustomerCoords();
  const distanceLabel = useMemo(() => {
    const { distanceMeters, distanceLabel: label } = resolveWorkerDistance(worker, customerCoords);
    return distanceMeters ? label : null;
  }, [worker.id, worker.distanceMeters, worker.lat, worker.lng, customerCoords]);

  const responseLabel = worker.responseTimeMins > 0 ? `~${worker.responseTimeMins} min reply` : null;

  // ── Price: lowest real offering price ──
  const startingPrice = worker.minPrice ?? worker.startingPrice;
  const hasPrice = typeof startingPrice === 'number' && startingPrice > 0;
  const currency = worker.currency || 'Rs';

  const handlePress = useCallback(() => {
    pushOnce(() => {
      router.push((isCompany ? `/company/${worker.id}` : `/worker/${worker.id}`) as any);
    });
  }, [router, isCompany, worker.id]);

  const handlePressIn = useCallback(() => {
    // Warm the profile cache so the screen opens with data (individual profiles only).
    if (!isCompany) prefetchWorkerProfile(queryClient, worker.id);
  }, [queryClient, isCompany, worker.id]);

  const metaParts = [distanceLabel, responseLabel].filter(Boolean) as string[];

  const a11yLabel = [
    displayName,
    isCompany ? 'company' : null,
    isVerified ? 'verified' : null,
    categoryLabel,
    hasRating ? `rated ${rating.toFixed(1)} from ${reviews} reviews` : 'new, no reviews yet',
    ...metaParts,
    isBusy ? 'currently on a job' : isOnline ? 'online now' : null,
    hasPrice ? `starts at ${currency} ${formatPrice(startingPrice)}` : 'price on quote',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      android_ripple={{ color: colors.bgHover }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      {/* Left: identity */}
      <View style={styles.avatarWrap}>
        <WorkerAvatar
          uri={worker.avatarUrl || (worker as any)?.avatar_url || null}
          name={displayName}
          size={AVATAR}
          isCompany={isCompany}
        />
        {isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Middle: name → category → metadata */}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {isVerified ? (
            <BadgeCheck size={15} color={colors.pureWhite} fill={colors.primaryDark} strokeWidth={2.4} />
          ) : null}
          {isCompany && <CompanyBadge variant="micro" />}
        </View>

        {categoryLabel ? (
          <Text style={styles.category} numberOfLines={1}>
            {categoryLabel}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {hasRating ? (
            <>
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              <Text style={styles.metaText}>({reviews})</Text>
            </>
          ) : (
            <Text style={styles.newLabel}>New</Text>
          )}
          {metaParts.length > 0 && (
            <Text style={styles.metaText} numberOfLines={1}>
              {`  ·  ${metaParts.join('  ·  ')}`}
            </Text>
          )}
        </View>

        {isBusy && <Text style={styles.busyText}>On a job · book for later</Text>}

        <OfferBadge promotion={worker.promotion} />
      </View>

      {/* Right: price */}
      <View style={styles.priceCol}>
        {hasPrice ? (
          <>
            <Text style={styles.priceLabel}>Starts at</Text>
            <Text style={styles.priceValue} numberOfLines={1}>
              {currency} {formatPrice(startingPrice)}
            </Text>
          </>
        ) : (
          <Text style={styles.quoteText}>On quote</Text>
        )}
      </View>

      {!isLast && <View style={styles.separator} />}
    </Pressable>
  );
};

export const WorkerListRow = memo(WorkerListRowBase);

/** Placeholder with the exact row geometry. */
export const WorkerListRowSkeleton: React.FC<{ isLast?: boolean }> = ({ isLast = false }) => {
  const styles = useThemedStyles(createStyles);
  return (
  // Same line boxes as the real row (name 15/20, category 13/18, meta 12.5/17, price 11 + 15/20).
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading worker">
    <SkeletonCircle size={AVATAR} />
    <View style={styles.body}>
      <SkeletonText fontSize={15} lineHeight={20} width="55%" />
      <SkeletonText fontSize={13} lineHeight={18} width="35%" />
      <SkeletonText fontSize={12.5} lineHeight={17} width="62%" style={styles.skeletonMeta} />
    </View>
    <View style={styles.priceCol}>
      <SkeletonText fontSize={11} lineHeight={15} width={40} style={styles.skeletonRight} />
      <SkeletonText fontSize={15} lineHeight={20} width={64} style={styles.skeletonPrice} />
    </View>
    {!isLast && <View style={styles.separator} />}
  </SkeletonGroup>
);
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingVertical: 14,
    backgroundColor: colors.bgCard,
  },
  rowPressed: {
    backgroundColor: colors.bgSubtle,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bgCard,
  },
  body: {
    flex: 1,
    minWidth: 0,
    marginLeft: AVATAR_GAP,
    marginRight: 12,
  },
  skeletonMeta: {
    marginTop: 3,
  },
  skeletonRight: {
    alignItems: 'flex-end',
  },
  skeletonPrice: {
    alignItems: 'flex-end',
    marginTop: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.jakarta.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  category: {
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingValue: {
    fontFamily: typography.fontFamily.inter.semiBold,
    fontSize: 12.5,
    color: colors.textPrimary,
    marginLeft: 3,
    marginRight: 2,
  },
  metaText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  newLabel: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 11.5,
    color: colors.textGreen,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  busyText: {
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 12,
    color: palette.amber700,
    marginTop: 3,
  },
  priceCol: {
    alignItems: 'flex-end',
    // Keeps long prices from squeezing the name column below a readable width.
    maxWidth: '34%',
  },
  priceLabel: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  priceValue: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.primaryDark,
    marginTop: 1,
  },
  quoteText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  separator: {
    position: 'absolute',
    left: WORKER_ROW_SEPARATOR_INSET,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
