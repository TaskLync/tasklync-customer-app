import { FC } from 'react';
import { StyleSheet, View, Text, Image, Pressable, Platform } from 'react-native';
import { StarIcon } from '../ui/Icon/icons';
import { useRouter } from 'expo-router';
import { WorkerInfo } from '../../store/cart.store';
import { VerifiedBadge } from '../worker/VerifiedBadge';
import { WorkerProfileLink } from '../worker/WorkerProfileLink';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const AVATAR_SIZE = 46;

interface CartWorkerCardProps {
  worker: WorkerInfo | null;
  onChangeWorker?: () => void;
}

export const CartWorkerCard: FC<CartWorkerCardProps> = ({
  worker,
  onChangeWorker,
}) => {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  if (!worker) return null;

  const handleChangePress = () => {
    if (onChangeWorker) {
      onChangeWorker();
    } else {
      router.push('/(tabs)/explore');
    }
  };

  return (
    <View style={styles.card}>
      {/* Avatar: opens the worker's profile */}
      <WorkerProfileLink
        workerId={worker.id}
        isCompany={Boolean(worker.isCompany || worker.providerType === 'COMPANY')}
        workerName={worker.name}
        size={AVATAR_SIZE}
      >
      {worker.avatarUrl ? (
        <Image
          source={{ uri: worker.avatarUrl }}
          style={styles.avatar}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
          </Text>
        </View>
      )}
      </WorkerProfileLink>

      {/* Info Container */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.workerName} numberOfLines={1}>
            {worker.name}
          </Text>
          {Boolean(worker.isVerified) && (
            <VerifiedBadge size="xs" showLabel={false} style={styles.badgeMargin} />
          )}
        </View>

        <View style={styles.metaRow}>
          <StarIcon size={13} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.ratingText}>
            {worker.avgRating ? worker.avgRating.toFixed(1) : '4.9'}
          </Text>
          <Text style={styles.categoryText}> • {worker.category || 'Service Pro'}</Text>
        </View>
      </View>

      {/* Change Worker Link */}
      <Pressable
        style={({ pressed }) => [styles.changeButton, pressed && styles.changeButtonPressed]}
        onPress={handleChangePress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Change selected worker"
      >
        <Text style={styles.changeText}>Change</Text>
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.bgSection,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: 16,
    color: colors.primaryDark,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  workerName: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: typography.fontSize.body2,
    color: colors.textPrimary,
  },
  badgeMargin: {
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: typography.fontSize.caption,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  categoryText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: typography.fontSize.caption,
    color: colors.textMuted,
  },
  changeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeButtonPressed: {
    backgroundColor: colors.bgSection,
  },
  changeText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: typography.fontSize.caption,
    color: colors.primaryDark,
  },
});
