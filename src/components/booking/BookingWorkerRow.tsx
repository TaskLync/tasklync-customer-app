import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { BuildingIcon, ShieldCheckIcon } from '../ui/Icon/icons';
import { isGenericWorkerName } from '../../services/api/booking.api';
import { WorkerProfileLink } from '../worker/WorkerProfileLink';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const AVATAR_SIZE = 48;

interface BookingWorkerRowProps {
  workerName?: string | null | undefined;
  categoryName?: string | null | undefined;
  workerAvatarUrl?: string | null | undefined;
  isCompany?: boolean | undefined;
  assignedWorkerName?: string | null | undefined;
  /** Provider id; when present the avatar opens the provider's public profile. */
  workerId?: string | null | undefined;
}

export function BookingWorkerRow({
  workerName,
  categoryName,
  workerAvatarUrl,
  isCompany,
  assignedWorkerName,
  workerId,
}: BookingWorkerRowProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [imageError, setImageError] = useState(false);
  const displayCategory = categoryName || 'Service';
  const hasRealName = Boolean(workerName && !isGenericWorkerName(workerName));

  const displayWorkerName = hasRealName
    ? workerName
    : categoryName
    ? `Assigned ${categoryName.replace(/s$/i, '')}`
    : isCompany
    ? 'Verified Service Agency'
    : 'Assigned Worker';

  const getInitials = (name?: string | null): string => {
    if (!name || isGenericWorkerName(name)) return isCompany ? 'A' : 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const avatarInitial = getInitials(displayWorkerName);

  return (
    <View style={styles.container}>
      {/* Avatar / Logo with robust fallback; taps open the provider's profile, not the booking */}
      <WorkerProfileLink
        workerId={workerId}
        isCompany={Boolean(isCompany)}
        workerName={hasRealName ? workerName : null}
        size={AVATAR_SIZE}
      >
      {workerAvatarUrl && !imageError ? (
        <ExpoImage
          source={{ uri: workerAvatarUrl }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.avatarPlaceholder, isCompany && styles.agencyAvatarPlaceholder]}>
          {isCompany ? (
            <BuildingIcon size={20} color={colors.textInfo} strokeWidth={2.2} />
          ) : (
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          )}
        </View>
      )}
      </WorkerProfileLink>

      {/* Responsive Flexible Text Container: Bounded flex-1 with minWidth-0 */}
      <View style={styles.textContainer}>
        <View style={styles.nameRow}>
          <Text
            style={styles.workerName}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {displayWorkerName}
          </Text>
          {isCompany && (
            <View style={styles.agencyBadge}>
              <ShieldCheckIcon size={10} color={colors.textGreen} strokeWidth={2.5} />
              <Text style={styles.agencyBadgeText}>Agency</Text>
            </View>
          )}
        </View>

        <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">
          {assignedWorkerName
            ? `${displayCategory} • Tech: ${assignedWorkerName}`
            : displayCategory}
        </Text>
      </View>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 12,
    flexShrink: 0,
    backgroundColor: colors.bgSection,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  agencyAvatarPlaceholder: {
    backgroundColor: colors.infoLight,
  },
  avatarText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: colors.textGreen,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  workerName: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  agencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: colors.bgHover,
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 5,
    flexShrink: 0,
    marginTop: 1.5,
  },
  agencyBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: colors.textGreen,
  },
  categoryName: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
