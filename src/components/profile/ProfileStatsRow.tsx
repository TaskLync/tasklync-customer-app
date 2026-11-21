import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRightIcon, RefreshIcon } from '../ui/Icon/icons';
import { fontFamily } from '../../design';
import { Skeleton } from '../ui/Skeleton/Skeleton';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ProfileStatsRowProps {
  /** Real count from the server; undefined while loading or when it could not be loaded. */
  completedBookings?: number | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Opens booking history. */
  onPress?: () => void;
}

/**
 * Completed bookings: one quiet, full-width row (number + label, "View history" on the right).
 * Never shows a placeholder number: loading shows a skeleton of the same size, an error shows a retry.
 */
export const ProfileStatsRow: React.FC<ProfileStatsRowProps> = ({
  completedBookings,
  isLoading = false,
  isError = false,
  onRetry,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const failed = isError && completedBookings === undefined;
  const loading = !failed && completedBookings === undefined && (isLoading || !isError);
  const handlePress = failed ? onRetry : onPress;

  const a11yLabel = failed
    ? "Couldn't load completed bookings. Tap to try again."
    : loading
      ? 'Loading completed bookings'
      : `${completedBookings} completed ${completedBookings === 1 ? 'booking' : 'bookings'}. View booking history.`;

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading || !handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.left}>
        {failed ? (
          <>
            <Text style={styles.errorTitle}>Couldn't load</Text>
            <Text style={styles.label}>Completed bookings</Text>
          </>
        ) : loading ? (
          <>
            {/* Same footprint as the number + label, so nothing shifts when the count arrives. */}
            <Skeleton width={36} height={26} borderRadius={6} />
            <Skeleton width={128} height={13} borderRadius={4} style={styles.labelSkeleton} />
          </>
        ) : (
          <>
            <Text style={styles.value} maxFontSizeMultiplier={1.3}>
              {completedBookings}
            </Text>
            <Text style={styles.label} maxFontSizeMultiplier={1.3}>
              Completed {completedBookings === 1 ? 'booking' : 'bookings'}
            </Text>
          </>
        )}
      </View>

      {failed ? (
        <View style={styles.action}>
          <RefreshIcon size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.actionText}>Try again</Text>
        </View>
      ) : onPress ? (
        <View style={styles.action}>
          <Text style={styles.actionText}>View history</Text>
          <ChevronRightIcon size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      ) : null}
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 76,
    backgroundColor: colors.cardRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
  },
  cardPressed: {
    backgroundColor: colors.bgHover,
  },
  left: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  value: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  labelSkeleton: {
    marginTop: 6,
  },
  errorTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  actionText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
