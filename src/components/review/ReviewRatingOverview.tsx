import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { WorkerRatingSummary, ReviewSummaryData, REVIEW_TAGS } from '../../types/review.types';
import { ReviewStarRow } from './ReviewStarRow';
import { colors, palette } from '../../design/colors';
import { fontFamily as fonts } from '../../design/typography';

interface ReviewRatingOverviewProps {
  summary: WorkerRatingSummary | ReviewSummaryData;
  style?: ViewStyle;
}

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

/**
 * ReviewRatingOverview Component
 *
 * Implements Section 4.6 of REVIEW_SERVICE_CUSTOMER_API_SPECIFICATION.md:
 * - Large average rating with star indicators
 * - 5-star to 1-star percentage progress breakdown
 * - Highlights top customer tags and counts
 */
export const ReviewRatingOverview = ({ summary, style }: ReviewRatingOverviewProps) => {
  // Normalize fields between WorkerRatingSummary and legacy ReviewSummaryData
  const average =
    'average' in summary
      ? summary.average
      : 'avgRating' in summary
      ? summary.avgRating
      : 5.0;

  const total =
    'total' in summary
      ? summary.total
      : 'totalReviews' in summary
      ? summary.totalReviews
      : 0;

  const distribution =
    'distribution' in summary
      ? summary.distribution
      : 'ratingBreakdown' in summary
      ? summary.ratingBreakdown
      : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const topTags =
    'top_tags' in summary
      ? summary.top_tags
      : 'topTags' in summary
      ? summary.topTags
      : [];

  const sum = STAR_LEVELS.reduce((acc, level) => {
    const count = (distribution as any)[String(level)] ?? (distribution as any)[level] ?? 0;
    return acc + count;
  }, 0);

  const countLabel = `${total} ${total === 1 ? 'review' : 'reviews'}`;

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityLabel={`Rated ${average.toFixed(1)} out of 5 from ${countLabel}`}
    >
      <View style={styles.topRow}>
        <View style={styles.scoreCol}>
          <Text style={styles.score}>{average > 0 ? average.toFixed(1) : '—'}</Text>
          <ReviewStarRow rating={average} size="sm" style={styles.stars} />
          <Text style={styles.count}>{countLabel}</Text>
        </View>

        {sum > 0 ? (
          <View style={styles.barsCol}>
            {STAR_LEVELS.map((level) => {
              const levelCount = (distribution as any)[String(level)] ?? (distribution as any)[level] ?? 0;
              const pct = sum > 0 ? (levelCount / sum) * 100 : 0;

              return (
                <View key={level} style={styles.barRow}>
                  <Text style={styles.barLabel}>{level}</Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{levelCount}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Top Tags Section (from Review Service Spec 4.6) */}
      {topTags && topTags.length > 0 && (
        <View style={styles.tagsContainer}>
          <Text style={styles.tagsHeading}>Customers praise</Text>
          <View style={styles.tagsRow}>
            {topTags.map((item) => {
              const meta = REVIEW_TAGS[item.tag];
              const label = meta ? meta.label : item.tag;

              return (
                <View key={item.tag} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>
                    {label} <Text style={styles.tagBadgeCount}>({item.count})</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgSection,
    borderRadius: 16,
    padding: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreCol: {
    alignItems: 'center',
    minWidth: 90,
  },
  score: {
    fontFamily: fonts.poppins.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  stars: {
    marginTop: 2,
  },
  count: {
    fontFamily: fonts.jakarta.medium,
    fontSize: 12,
    color: palette.gray500,
    marginTop: 8,
  },
  barsCol: {
    flex: 1,
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 10,
    fontFamily: fonts.inter.semiBold,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.gray100,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  barCount: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 11,
    color: colors.textSecondary,
    width: 22,
    textAlign: 'right',
  },
  tagsContainer: {
    marginTop: 16,
  },
  tagsHeading: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  tagBadgeText: {
    fontFamily: fonts.jakarta.medium,
    fontSize: 12,
    color: colors.textGreen,
  },
  tagBadgeCount: {
    fontFamily: fonts.jakarta.semiBold,
    color: colors.primaryDark,
  },
});
