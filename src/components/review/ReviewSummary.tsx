import { View, StyleSheet, Text, ViewStyle, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ReviewSummaryData, WorkerRatingSummary } from '../../types/review.types';
import { ReviewStarRow } from './ReviewStarRow';
import { colors, palette } from '../../design/colors';
import { fontFamily as fonts } from '../../design/typography';

interface ReviewSummaryProps {
  summary?: ReviewSummaryData | WorkerRatingSummary | undefined;
  onViewAll?: () => void;
  style?: ViewStyle;
  compact?: boolean;
  animated?: boolean;
  onLayout?: (e: any) => void;
}

/**
 * Compact, minimalist review rating summary (Uber / Careem / Foodpanda standard)
 * Highlights average score, 5-star visual, review count, and a subtle "See all" action.
 */
export const ReviewSummary = ({
  summary,
  onViewAll,
  style,
  compact = false,
  onLayout,
}: ReviewSummaryProps) => {
  if (!summary) return null;

  // Safely extract rating and total count across both ReviewSummaryData and WorkerRatingSummary formats
  const rawRating =
    (summary as any)?.avgRating !== undefined
      ? (summary as any).avgRating
      : (summary as any)?.average !== undefined
      ? (summary as any).average
      : 0;

  const avgRating = typeof rawRating === 'number' && !isNaN(rawRating) ? rawRating : 0;
  const ratingDisplay = avgRating > 0 ? avgRating.toFixed(1) : '—';

  const rawTotal =
    (summary as any)?.totalReviews !== undefined
      ? (summary as any).totalReviews
      : (summary as any)?.total !== undefined
      ? (summary as any).total
      : 0;

  const totalReviews = typeof rawTotal === 'number' && !isNaN(rawTotal) ? rawTotal : 0;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]} onLayout={onLayout}>
        <View style={styles.compactLeft}>
          <Text style={styles.compactRatingText}>{ratingDisplay}</Text>
          <ReviewStarRow rating={avgRating} size="xs" />
          <Text style={styles.compactTotalText}>
            ({totalReviews})
          </Text>
        </View>
        {onViewAll && totalReviews > 0 && (
          <Pressable onPress={onViewAll} hitSlop={8} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See all</Text>
            <ChevronRight size={13} color={colors.primaryDark} strokeWidth={2.4} />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <View style={styles.headerRow}>
        <View style={styles.leftCol}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <View style={styles.ratingMetaRow}>
            <Text style={styles.scoreText}>{ratingDisplay}</Text>
            <ReviewStarRow rating={avgRating} size="sm" />
            <Text style={styles.dot}>·</Text>
            <Text style={styles.totalText}>
              {totalReviews > 0
                ? `${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'}`
                : 'No reviews yet'}
            </Text>
          </View>
        </View>

        {onViewAll && totalReviews > 0 && (
          <Pressable
            onPress={onViewAll}
            hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
            style={({ pressed }) => [styles.seeAllBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`See all ${totalReviews} reviews`}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <ChevronRight size={14} color={colors.primaryDark} strokeWidth={2.4} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftCol: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fonts.poppins.semiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 2,
  },
  ratingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreText: {
    fontFamily: fonts.inter.bold,
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: 2,
  },
  dot: {
    fontSize: 12,
    color: palette.gray400,
  },
  totalText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  seeAllText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  pressed: {
    opacity: 0.65,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactRatingText: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  compactTotalText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
