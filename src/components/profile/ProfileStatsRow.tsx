import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Star } from 'lucide-react-native';
import { UserProfileStats } from '../../types/user.types';
import { colors, fontFamily } from '../../design';

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
  const bookingsCount = stats?.bookings_count ?? stats?.completed_jobs ?? 0;
  const rating = stats?.rating ? stats.rating.toFixed(1) : '5.0';

  return (
    <View style={styles.container}>
      {/* Stat 1: Completed Bookings */}
      <View style={styles.statCard}>
        <View style={styles.iconCircle}>
          <CheckCircle2 size={18} color={colors.primaryDark} strokeWidth={2.2} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.statValue}>{bookingsCount}</Text>
          <Text style={styles.statLabel}>Jobs Completed</Text>
        </View>
      </View>

      {/* Stat 2: Customer Rating */}
      <View style={styles.statCard}>
        <View style={[styles.iconCircle, styles.iconCircleRating]}>
          <Star size={17} color="#D97706" fill="#F59E0B" strokeWidth={1.5} />
        </View>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  iconCircleRating: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
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
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 17,
    color: '#0F172A',
  },
  ratingMax: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
  statLabel: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: -1,
  },
});
