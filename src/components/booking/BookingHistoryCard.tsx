import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { statusToLabel } from '../../utils/bookingStatus';
import { colors, palette, fontFamily, spacing } from '../../design';

export interface BookingHistoryItem {
  id: string;
  booking_number?: string;
  worker_id?: string;
  worker_name: string;
  worker_avatar?: string;
  category: string;
  service_title: string;
  status: string;
  total_amount: number;
  currency?: string;
  created_at: string; // ISO date
  scheduled_at?: string;
}

export interface BookingHistoryCardProps {
  booking: BookingHistoryItem;
}

const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

export const BookingHistoryCard: React.FC<BookingHistoryCardProps> = ({ booking }) => {
  const router = useRouter();

  const formattedDate = formatDate(booking.created_at || booking.scheduled_at || '');
  const formattedAmount = `Rs. ${Number(booking.total_amount || 0).toLocaleString()}`;
  const statusDisplay = statusToLabel(booking.status);

  const handlePress = () => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: booking.id },
    } as any);
  };

  const a11yLabel = `${booking.service_title || booking.category} by ${booking.worker_name}, ${statusDisplay}, ${formattedAmount}, on ${formattedDate}`;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Double tap to view booking receipt and details"
    >
      {/* Middle: Worker & Service Info */}
      <View style={styles.middleContainer}>
        <Text style={styles.workerName} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {booking.worker_name}
        </Text>
        <Text style={styles.serviceSubtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {booking.service_title || booking.category}
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText} maxFontSizeMultiplier={1.2}>
            {statusDisplay}
          </Text>
        </View>
      </View>

      {/* Right: Amount & Date in Inter */}
      <View style={styles.rightContainer}>
        <Text style={styles.amountText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {formattedAmount}
        </Text>
        <Text style={styles.dateText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {formattedDate}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leftContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.iceGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: colors.bgCard,
    borderRadius: 6,
    padding: 2,
  },
  middleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  workerName: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  serviceSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  dateText: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 3,
  },
});
