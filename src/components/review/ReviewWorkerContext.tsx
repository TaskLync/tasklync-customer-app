import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle2, User } from 'lucide-react-native';
import { colors, palette, fontFamily, fontSize } from '../../design';

export interface ReviewWorkerContextProps {
  workerName: string;
  workerAvatar?: string | null | undefined;
  serviceName?: string | undefined;
  completedDate?: string | undefined;
}

/**
 * ReviewWorkerContext Component
 *
 * Re-anchors context at the top of the review screen:
 * - Shows worker avatar with fallback placeholder (using high-performance expo-image)
 * - Verified pro badge and typography hierarchy
 * - Job title and completed date
 * - Fixed height to avoid pushing rating section offscreen on small devices
 */
export const ReviewWorkerContext: React.FC<ReviewWorkerContextProps> = ({
  workerName,
  workerAvatar,
  serviceName,
  completedDate,
}) => {
  const formattedDate = useMemo(() => {
    if (!completedDate) return 'Completed recently';
    try {
      const d = new Date(completedDate);
      if (isNaN(d.getTime())) return completedDate;
      return `Completed on ${d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } catch {
      return completedDate;
    }
  }, [completedDate]);

  return (
    <View style={styles.card} accessibilityRole="summary">
      {/* Avatar Slot */}
      <View style={styles.avatarContainer}>
        {workerAvatar ? (
          <Image
            source={{ uri: workerAvatar }}
            style={styles.avatarImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <User size={20} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Worker & Service Metadata */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={styles.workerName} numberOfLines={1}>
            {workerName || 'Service Professional'}
          </Text>
          <CheckCircle2 size={15} color={colors.primary} style={styles.verifiedIcon} />
        </View>

        <View style={styles.metaRow}>
          {serviceName ? (
            <View style={styles.serviceBadge}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {serviceName}
              </Text>
            </View>
          ) : null}
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.bgCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: palette.gray100,
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gray100,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerName: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 1,
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: 6,
  },
  verifiedIcon: {
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceBadge: {

  },
  serviceName: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  dateText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
