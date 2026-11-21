import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BuildingIcon, StarIcon, UserIcon } from '../../ui/Icon/icons';
import { SummarySectionCard } from './SummarySectionCard';
import { WorkerInfo } from '../../../store/cart.store';
import { fontFamily } from '../../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';
import { WorkerProfileLink } from '../../worker/WorkerProfileLink';

const AVATAR_SIZE = 44;

export interface SummaryWorkerRowProps {
  worker: WorkerInfo | null;
}

/** Shown only when the customer picked a worker or agency. */
export const SummaryWorkerRow: React.FC<SummaryWorkerRowProps> = ({ worker }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  if (!worker) return null;

  const isCompany = Boolean(worker.isCompany || worker.providerType === 'COMPANY' || worker.businessName);
  const workerName = isCompany ? worker.businessName || worker.name : worker.name;
  const rating = typeof worker.avgRating === 'number' && worker.avgRating > 0 ? worker.avgRating : null;
  const category = worker.category || null;

  return (
    <SummarySectionCard title={isCompany ? 'Agency' : 'Worker'}>
      <View style={styles.contentRow}>
        <WorkerProfileLink workerId={worker.id} isCompany={isCompany} workerName={workerName} size={AVATAR_SIZE}>
          {worker.avatarUrl ? (
            <Image source={{ uri: worker.avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              {isCompany ? (
                <BuildingIcon size={20} color={colors.textMuted} />
              ) : (
                <UserIcon size={20} color={colors.textMuted} />
              )}
            </View>
          )}
        </WorkerProfileLink>

        <View style={styles.infoContainer}>
          <Text style={styles.nameText} numberOfLines={1}>{workerName}</Text>
          {category || rating !== null ? (
            <View style={styles.metaRow}>
              {category ? <Text style={styles.metaText} numberOfLines={1}>{category}</Text> : null}
              {category && rating !== null ? <Text style={styles.metaText}>{'  ·  '}</Text> : null}
              {rating !== null ? (
                <View style={styles.ratingGroup} accessibilityLabel={`Rating ${rating.toFixed(1)}`}>
                  <StarIcon size={11} color={colors.textPrimary} fill={colors.textPrimary} />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </SummarySectionCard>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.bgSection,
    marginRight: 14,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  nameText: {
    fontFamily: fontFamily.poppins.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    flexShrink: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  ratingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: fontFamily.inter.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
});
