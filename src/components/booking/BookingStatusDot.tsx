import { View, StyleSheet } from 'react-native';
import { BookingStatus } from '../../types/booking.types';
import { createBookingStatusMap } from '../../utils/bookingStatusMap';
import { useAppTheme, useThemedStyles } from '../../theme/useAppTheme';

export interface BookingStatusDotProps {
  status: BookingStatus;
  size?: number;
}

export const BookingStatusDot: React.FC<BookingStatusDotProps> = ({ status, size = 6 }) => {
  const { colors } = useAppTheme();
  const bookingStatusMap = useThemedStyles(createBookingStatusMap);
  const config = bookingStatusMap[status] || { color: colors.textMuted };

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.color,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    marginRight: 6,
  },
});
