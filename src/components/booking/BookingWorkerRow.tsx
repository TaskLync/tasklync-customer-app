import { colors } from '../../design';
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Building2, ShieldCheck } from 'lucide-react-native';
import { isGenericWorkerName } from '../../services/api/booking.api';

interface BookingWorkerRowProps {
  workerName?: string | null | undefined;
  categoryName?: string | null | undefined;
  workerAvatarUrl?: string | null | undefined;
  isCompany?: boolean | undefined;
  assignedWorkerName?: string | null | undefined;
}

export function BookingWorkerRow({
  workerName,
  categoryName,
  workerAvatarUrl,
  isCompany,
  assignedWorkerName,
}: BookingWorkerRowProps) {
  const [imageError, setImageError] = useState(false);
  const displayCategory = categoryName || 'Service';
  const hasRealName = Boolean(workerName && !isGenericWorkerName(workerName));

  const displayWorkerName = hasRealName
    ? workerName
    : categoryName
    ? `Assigned ${categoryName.replace(/s$/i, '')}`
    : isCompany
    ? 'Verified Service Agency'
    : 'Assigned Professional';

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
      {/* Avatar / Logo with robust fallback */}
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
            <Building2 size={20} color={colors.textInfo} strokeWidth={2.2} />
          ) : (
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          )}
        </View>
      )}

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
              <ShieldCheck size={10} color={colors.textGreen} strokeWidth={2.5} />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    flexShrink: 0,
    backgroundColor: colors.bgSection,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
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
    backgroundColor: colors.primaryBorderSubtle,
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
