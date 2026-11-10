import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { UserCheck, Star, User, Building2 } from 'lucide-react-native';
import { SummarySectionCard } from './SummarySectionCard';
import { WorkerInfo } from '../../../store/cart.store';
import { fontFamily } from '../../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SummaryWorkerRowProps {
  worker: WorkerInfo | null;
}

export const SummaryWorkerRow: React.FC<SummaryWorkerRowProps> = ({ worker }) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isCompany = Boolean(
    worker?.isCompany ||
    worker?.providerType === 'COMPANY' ||
    Boolean(worker?.businessName)
  );
  const workerName = isCompany
    ? (worker?.businessName || worker?.name || 'Verified Service Agency')
    : (worker?.name || 'Assigned Professional');
  const avatarUrl = worker?.avatarUrl;
  const rating = worker?.avgRating;
  const category = worker?.category || (isCompany ? 'Service Agency' : 'Service Professional');

  return (
    <SummarySectionCard
      icon={
        isCompany ? (
          <Building2 size={16} color={colors.textInfo} strokeWidth={2.2} />
        ) : (
          <UserCheck size={16} color={colors.primaryDark} strokeWidth={2.2} />
        )
      }
      title={isCompany ? 'Service Agency' : 'Service Professional'}
    >
      <View style={styles.contentRow}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, isCompany && { backgroundColor: colors.infoLight, borderColor: colors.borderInfoLight }]}>
            {isCompany ? (
              <Building2 size={22} color={colors.textInfo} />
            ) : (
              <User size={22} color={palette.gray500} />
            )}
          </View>
        )}

        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{workerName}</Text>
            {isCompany && (
              <View style={styles.agencyBadge}>
                <Text style={styles.agencyBadgeText}>Agency</Text>
              </View>
            )}
          </View>
          <Text style={styles.categoryText}>
            {category}
          </Text>

          {typeof rating === 'number' && rating > 0 && (
            <View style={styles.ratingRow}>
              <Star size={12} color={palette.warning} fill={palette.warning} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>
          )}
        </View>
      </View>
    </SummarySectionCard>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gray200,
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  categoryText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  ratingLabel: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11,
    color: colors.primaryDark,
    marginLeft: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agencyBadge: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  agencyBadgeText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 10,
    color: colors.textInfo,
  },
});
