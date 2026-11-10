import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserProfileStats } from '../../types/user.types';
import { fontFamily } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ProfileStatsRowProps {
  stats?: UserProfileStats | undefined;
}

/**
 * ProfileStatsRow Component
 *
 * Compact twin stat cards:
 * - Real user data
 * - Consistent 16px corner radius
 * - Subtle border and micro-shadow
 */
export const ProfileStatsRow: React.FC<ProfileStatsRowProps> = ({ stats }) => {
  const styles = useThemedStyles(createStyles);
  const bookingsCount = stats?.bookings_count ?? stats?.completed_jobs ?? 0;
  const rating = stats?.rating ? stats.rating.toFixed(1) : '5.0';

  return (
    <View style={styles.container}>
      {/* Stat 1: Completed Bookings */}
      <View style={styles.statCard}>
        <View style={styles.textCol}>
          <Text style={styles.statValue}>{bookingsCount}</Text>
          <Text style={styles.statLabel}>Jobs Completed</Text>
        </View>
      </View>

      {/* Stat 2: Customer Rating */}
      <View style={styles.statCard}>
        <View style={styles.textCol}>
          <View style={styles.ratingRow}>
            <Text style={styles.statValue}>{rating}</Text>
            <Text style={styles.ratingMax}>/5.0</Text>
          </View>
          <Text style={styles.statLabel}>User Rating</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSection,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorderSubtle,
  },
  iconCircleRating: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  textCol: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  ratingMax: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  statLabel: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -1,
  },
});
