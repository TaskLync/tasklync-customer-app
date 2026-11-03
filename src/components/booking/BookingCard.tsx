import { colors } from '../../design';
import { View, StyleSheet, Pressable } from 'react-native';
import { BookingDetails } from '../../types/booking.types';
import { BookingStatusBadge } from './BookingStatusBadge';
import { BookingWorkerRow } from './BookingWorkerRow';
import { BookingServiceMeta } from './BookingServiceMeta';
import { BookingPriceTag } from './BookingPriceTag';
import { BookingCountdown } from './BookingCountdown';
import { BookingActions } from './BookingActions';
import { useRouter } from 'expo-router';

interface BookingCardProps {
  booking: BookingDetails;
}

export function BookingCard({ booking }: BookingCardProps) {
  const router = useRouter();

  const isCompany = Boolean(
    booking.is_company ||
    booking.provider_type === 'COMPANY'
  );

  const displayName =
    (isCompany
      ? (booking.provider_name || (booking as any).business_name || booking.worker_name)
      : (booking.worker_name || booking.provider_name)) ?? undefined;

  const displayAvatar =
    (isCompany
      ? (booking.provider_avatar_url || booking.worker_avatar_url)
      : (booking.worker_avatar_url || booking.provider_avatar_url)) ?? undefined;

  const handlePress = () => {
    router.push(`/booking/${booking.id}` as any);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'track':
        router.push(`/booking/${booking.id}` as any);
        break;
      case 'message':
        router.push({
          pathname: `/booking/${booking.id}/chat`,
          params: {
            workerName: displayName,
            companyName: isCompany ? displayName : undefined,
            workerAvatar: displayAvatar,
            workerPhone: booking.worker_phone,
            categoryName: booking.category_name,
            workerId: booking.worker_id,
            isCompany: isCompany ? 'true' : 'false',
          },
        } as any);
        break;
      case 'review':
        router.push(`/booking/${booking.id}/review` as any);
        break;
      case 'dispute':
        router.push(`/booking/${booking.id}/dispute` as any);
        break;
      case 'invoice':
        router.push(`/booking/${booking.id}/invoice` as any);
        break;
      case 'book_again':
        router.push('/(tabs)' as any);
        break;
      default:
        router.push(`/booking/${booking.id}` as any);
        break;
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <BookingStatusBadge status={booking.status} />
        <BookingPriceTag amount={booking.estimated_total} currency={booking.currency} />
      </View>

      <BookingWorkerRow
        workerName={displayName}
        categoryName={booking.category_name}
        workerAvatarUrl={displayAvatar}
        isCompany={isCompany}
        assignedWorkerName={booking.assigned_worker_name || (booking as any).assignee?.name}
      />

      <BookingServiceMeta scheduledAt={booking.scheduled_at} />
      
      {booking.status === 'PENDING' && (
        <BookingCountdown expiresAt={booking.expires_at} status={booking.status} />
      )}

      <BookingActions status={booking.status} onAction={handleAction} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.bgSection,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
});
