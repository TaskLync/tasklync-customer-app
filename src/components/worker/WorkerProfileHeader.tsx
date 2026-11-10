import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { ArrowLeft, Share2, Ellipsis, Star, BadgeCheck } from 'lucide-react-native';
import { SharedValue } from 'react-native-reanimated';
import { fontFamily } from '../../design/typography';
import { WorkerPublicProfile } from '../../types/worker.types';
import { WorkerAvatar } from './WorkerAvatar';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const AVATAR_SIZE = 76;

interface WorkerProfileHeaderProps {
  worker?: WorkerPublicProfile;
  scrollY?: SharedValue<number>;
  onBack: () => void;
  onShare: () => void;
  onMore: () => void;
  onRatingPress?: (() => void) | undefined;
}

const getPrimaryCategory = (worker?: WorkerPublicProfile): string | null => {
  const firstCat = worker?.categories?.[0] as unknown;
  if (typeof firstCat === 'string' && firstCat.trim()) return firstCat;
  if (firstCat && typeof firstCat === 'object') {
    return (firstCat as any).categoryName || (firstCat as any).name || null;
  }
  const firstSkill = worker?.skills?.[0];
  if (firstSkill && typeof firstSkill === 'object') return firstSkill.categoryName || null;
  return null;
};

export const WorkerProfileHeader: React.FC<WorkerProfileHeaderProps> = ({
  worker,
  onBack,
  onShare,
  onMore,
  onRatingPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const reviewCount = worker?.totalReviews ?? 0;
  const hasRealRating =
    typeof worker?.avgRating === 'number' && worker.avgRating > 0 && reviewCount > 0;

  const subtitle = [getPrimaryCategory(worker), worker?.city || worker?.distanceLabel || null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.navRightGroup}>
          <Pressable
            onPress={onShare}
            style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share profile"
          >
            <Share2 size={18} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={onMore}
            style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ellipsis size={18} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.identityRow}>
        <WorkerAvatar uri={worker?.avatarUrl ?? null} name={worker?.name ?? ''} size={AVATAR_SIZE} />

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {worker?.name || 'Worker'}
            </Text>
            {worker?.isVerified ? (
              <BadgeCheck
                size={18}
                color={colors.pureWhite}
                fill={colors.primaryDark}
                strokeWidth={2.2}
                accessibilityLabel="Verified"
              />
            ) : null}
          </View>

          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          {hasRealRating ? (
            <Pressable
              onPress={onRatingPress}
              disabled={!onRatingPress}
              hitSlop={8}
              style={styles.ratingRow}
              accessibilityRole="button"
              accessibilityLabel={`Rated ${worker?.avgRating?.toFixed(1)} from ${reviewCount} reviews`}
            >
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingText}>{worker?.avgRating?.toFixed(1)}</Text>
              <Text style={styles.reviewCountText}>
                ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.reviewCountText, styles.ratingRow]}>No reviews yet</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Pull the 40px touch targets to the visual edge so icons align with the content gutter.
    marginHorizontal: -10,
    marginBottom: 12,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPressed: {
    backgroundColor: colors.bgHover,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    flexShrink: 1,
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 21,
    lineHeight: 27,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  reviewCountText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
