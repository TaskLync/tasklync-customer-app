import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { fontFamily } from '../../design/typography';
import { colors } from '../../design/colors';

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

export const WorkerStats: React.FC<WorkerStatsProps> = ({
  yearsExperience,
  totalJobs = 0,
  avgResponseMins,
  style,
}) => {
  const expDisplay = typeof yearsExperience === 'number' && yearsExperience > 0
    ? `${yearsExperience}+ ${yearsExperience === 1 ? 'yr' : 'yrs'}`
    : '< 1 yr';

  const responseDisplay = typeof avgResponseMins === 'number' && avgResponseMins > 0
    ? `~${avgResponseMins} min`
    : 'Quick';


  return (
    <View style={[styles.container, style]}>
      {/* Col 1: Experience */}
      <View style={styles.col}>
        <Text style={styles.valueText}>
          {expDisplay}
        </Text>
        <Text style={styles.labelText}>Experience</Text>
      </View>

      <View style={styles.divider} />

      {/* Col 2: Jobs Done */}
      <View style={styles.col}>
        <Text style={styles.valueText}>
          {totalJobs}
        </Text>
        <Text style={styles.labelText}>Jobs Done</Text>
      </View>

      <View style={styles.divider} />

      {/* Col 3: Response Time */}
      <View style={styles.col}>
        <Text style={styles.valueText}>
          {responseDisplay}
        </Text>
        <Text style={styles.labelText}>Response Time</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSection,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.border,
  },
  icon: {
    marginBottom: 4,
  },
  valueText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  labelText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
