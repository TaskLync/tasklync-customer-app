import { colors, palette } from '../../design';
import { View, StyleSheet } from 'react-native';
import { BookingStatus } from '../../types/booking.types';
import { bookingStatusMap } from '../../utils/bookingStatusMap';

export interface BookingStatusDotProps {
  status: BookingStatus;
  size?: number;
}

export const BookingStatusDot: React.FC<BookingStatusDotProps> = ({ status, size = 6 }) => {
  const config = bookingStatusMap[status] || { color: '#6B7280' };

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
