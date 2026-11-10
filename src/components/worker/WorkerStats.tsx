import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { fontFamily } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface WorkerStatsProps {
  yearsExperience?: number | undefined;
  totalJobs?: number | undefined;
  avgResponseMins?: number | undefined;
  distanceLabel?: string | undefined;
  rating?: number | undefined;
  totalReviews?: number | undefined;
  onRatingPress?: (() => void) | undefined;
  style?: ViewStyle | undefined;
}

/**
 * Compact stats strip. Only renders values the backend actually provided —
 * unknown experience / response time are omitted instead of shown as placeholders.
 */
export const WorkerStats: React.FC<WorkerStatsProps> = ({
  yearsExperience,
  totalJobs,
  avgResponseMins,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  const stats: { label: string; value: string }[] = [];

  if (typeof totalJobs === 'number' && totalJobs >= 0) {
    stats.push({ label: totalJobs === 1 ? 'Job done' : 'Jobs done', value: totalJobs.toLocaleString() });
  }
  if (typeof yearsExperience === 'number' && yearsExperience > 0) {
    stats.push({
      label: 'Experience',
      value: `${yearsExperience} ${yearsExperience === 1 ? 'yr' : 'yrs'}`,
    });
  }
  if (typeof avgResponseMins === 'number' && avgResponseMins > 0) {
    stats.push({ label: 'Response', value: `~${avgResponseMins} min` });
  }

  if (stats.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <View style={styles.separator} />}
          <View style={styles.col} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
            <Text style={styles.valueText} numberOfLines={1}>
              {s.value}
            </Text>
            <Text style={styles.labelText} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSection,
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: colors.border,
  },
  valueText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  labelText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
});
