import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { WorkerServiceRow, SERVICE_ROW_INSET } from './WorkerServiceRow';
import { SkeletonWorkerServiceRow } from '../ui/Skeleton/SkeletonWorkerServiceRow';
import { SkeletonGroup } from '../ui/Skeleton/Skeleton';
import { typography } from '../../design/typography';
import { WorkerServiceOffering } from '../../types/worker.types';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface WorkerServicesSectionProps {
  services: WorkerServiceOffering[];
  workerId: string;
  workerName?: string;
  workerAvatar?: string | null;
  workerRating?: number;
  workerCategory?: string;
  workerVerified?: boolean;
  startingPrice?: number | null;
  isLoading?: boolean;
  /** Rendered directly under the list (e.g. "Request a custom quote"). */
  footer?: React.ReactNode;
  style?: ViewStyle;
}

export const WorkerServicesSection: React.FC<WorkerServicesSectionProps> = ({
  services,
  workerId,
  workerName,
  workerAvatar,
  workerRating,
  workerCategory,
  workerVerified,
  isLoading = false,
  footer,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  if (isLoading) {
    return (
      <View style={style}>
        <Text style={[styles.sectionHeader, styles.loadingHeader]}>Services</Text>
        <SkeletonGroup accessibilityLabel="Loading services">
          <SkeletonWorkerServiceRow />
          <SkeletonWorkerServiceRow />
        </SkeletonGroup>
      </View>
    );
  }

  // Services are rendered exactly as returned by the API — no filtering or re-ordering.
  if (!services || services.length === 0) {
    return footer ? <View style={style}>{footer}</View> : null;
  }

  return (
    <View style={style}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeader}>Services</Text>
        <Text style={styles.countText}>{services.length}</Text>
      </View>

      <View style={styles.list}>
        {services.map((service) => (
          <WorkerServiceRow
            key={service.id}
            service={service}
            workerId={workerId}
            workerName={workerName}
            workerAvatar={workerAvatar}
            workerRating={workerRating}
            workerCategory={workerCategory}
            workerVerified={workerVerified}
          />
        ))}
      </View>

      {footer}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  sectionHeader: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  loadingHeader: {
    marginBottom: 6,
  },
  countText: {
    fontFamily: typography.fontFamily.inter.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  list: {
    // Row surfaces bleed into the gutter so their text lines up with the section title.
    marginHorizontal: -SERVICE_ROW_INSET,
    gap: 2,
  },
});
