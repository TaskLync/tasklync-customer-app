import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, palette, fontFamily } from '../../../design';

export interface SuccessSubtitleProps {
  subtitle?: string;
}

export const SuccessSubtitle: React.FC<SuccessSubtitleProps> = ({
  subtitle = 'Your service request has been sent to the professional.',
}) => (
  <View style={styles.container}>
    <Text style={styles.subtitleText}>{subtitle}</Text>
  </View>
);

export interface BookingIdCardProps {
  bookingId: string;
}

export const BookingIdCard: React.FC<BookingIdCardProps> = ({ bookingId }) => {
  if (!bookingId) return null;

  return (
    <View style={styles.card} accessible accessibilityLabel={`Booking ID ${bookingId}`}>
      <Text style={styles.idLabel}>BOOKING ID</Text>
      <Text style={styles.idValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        #{bookingId}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  subtitleText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    alignSelf: 'center',
    alignItems: 'center',
    minWidth: 180,
    maxWidth: '100%',
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  idLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 4,
  },
  idValue: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 18,
    letterSpacing: 0.3,
    color: colors.textPrimary,
  },
});
