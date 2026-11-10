import { View, Text, StyleSheet } from 'react-native';
import { BookingStatus } from '../../types/booking.types';
import { createBookingStatusMap } from '../../utils/bookingStatusMap';
import { useThemedStyles } from '../../theme/useAppTheme';

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const bookingStatusMap = useThemedStyles(createBookingStatusMap);
  const config = bookingStatusMap[status];
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.text }]} numberOfLines={1} ellipsizeMode="tail">
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    flexShrink: 1,
    minWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    flexShrink: 0,
  },
  label: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
});