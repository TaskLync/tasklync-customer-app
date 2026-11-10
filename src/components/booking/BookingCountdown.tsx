import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBookingCountdown } from '../../hooks/useBookingCountdown';
import { Clock, AlertCircle } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingCountdownProps {
  expiresAt?: string | undefined;
  status: string;
}

export function BookingCountdown({ expiresAt, status }: BookingCountdownProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (status !== 'PENDING' || !expiresAt) return null;

  const { isExpired, formattedText } = useBookingCountdown(expiresAt);

  return (
    <View
      style={[styles.container, isExpired && styles.containerExpired]}
      accessibilityRole="text"
      accessibilityLabel={`Booking timer: ${formattedText}`}
    >
      <View style={styles.iconWrap}>
        {isExpired ? (
          <AlertCircle size={12} color={colors.dangerMedium} strokeWidth={2.4} />
        ) : (
          <Clock size={12} color={colors.warningMedium} strokeWidth={2.4} />
        )}
      </View>
      <Text
        style={[styles.countdownText, isExpired && styles.countdownTextExpired]}
        numberOfLines={1}
      >
        {formattedText}
      </Text>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: 8,
    flexShrink: 0,
  },
  containerExpired: {
    backgroundColor: 'transparent',
  },
  iconWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4.5,
    flexShrink: 0,
  },
  countdownText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: colors.warningMedium,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  countdownTextExpired: {
    color: colors.dangerMedium,
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
