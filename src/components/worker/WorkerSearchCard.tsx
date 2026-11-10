import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { ShieldCheck, Zap } from 'lucide-react-native';
import { WorkerNearby } from '../../types/worker.types';
import { typography } from '../../design/typography';
import { usePressScale } from '../../hooks/usePressScale';
import { pushOnce } from '../../utils/navigationGuard';
import { prefetchWorkerProfile } from '../../hooks/useWorkerProfile';
import { OnlineBadge } from '../ui/Badge/OnlineBadge';
import { WorkerAvailabilityBadge } from './WorkerAvailabilityBadge';
import { WorkerAvatar } from './WorkerAvatar';
import { CompanyBadge } from '../company/CompanyBadge';
import { Chip } from '../ui/Chip';
import { useCustomerCoords } from '../../hooks/useCustomerCoords';
import { resolveWorkerDistance } from '../../utils/locationUtils';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface WorkerSearchCardProps {
  worker: WorkerNearby;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const WorkerSearchCard: React.FC<WorkerSearchCardProps> = ({ worker }) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const press = usePressScale(0.985);

  if (!worker) return null;

  const isCompany = Boolean(worker.isCompany || worker.providerType === 'COMPANY');

  const handlePress = () => {
    pushOnce(() => {
      if (isCompany) {
        router.push(`/company/${worker.id}` as any);
      } else {
        router.push(`/worker/${worker.id}` as any);
      }
    });
  };

  const categories = worker.categories || [];
  const displayName = isCompany ? (worker.businessName || worker.name) : worker.name;

  // Intelligently compute visible tags and overflow count for clean single-row presentation
  const { visibleCategories, overflowCount } = useMemo(() => {
    if (!categories.length) {
      return { visibleCategories: [], overflowCount: 0 };
    }

    if (categories.length === 1) {
      return { visibleCategories: categories, overflowCount: 0 };
    }

    if (categories.length === 2) {
      const combinedLen = (categories[0]?.length || 0) + (categories[1]?.length || 0);
      if (combinedLen <= 22) {
        return { visibleCategories: categories, overflowCount: 0 };
      }
      return { visibleCategories: [categories[0]], overflowCount: 1 };
    }

    // 3 or more categories
    const firstTwoLen = (categories[0]?.length || 0) + (categories[1]?.length || 0);
    if (firstTwoLen <= 18) {
      return {
        visibleCategories: categories.slice(0, 2),
        overflowCount: categories.length - 2,
      };
    }

    return {
      visibleCategories: [categories[0]],
      overflowCount: categories.length - 1,
    };
  }, [categories]);

  // Resolve accurate distance between customer and worker
  const customerCoords = useCustomerCoords();
  const distanceDisplay = useMemo(
    () => resolveWorkerDistance(worker, customerCoords).distanceLabel,
    [worker.id, worker.distanceMeters, worker.lat, worker.lng, customerCoords]
  );

  const priceFormatted = useMemo(() => {
    const min = worker.minPrice ?? worker.startingPrice;
    const max = worker.maxPrice;
    const curr = worker.currency || 'Rs';

    if (min !== null && min !== undefined && max !== null && max !== undefined && max > min) {
      return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    }
    if (min !== null && min !== undefined && min > 0) {
      return `${curr} ${min.toLocaleString()}`;
    }
    return 'Quote';
  }, [worker.minPrice, worker.maxPrice, worker.startingPrice, worker.currency]);

  const isBackgroundVerified = worker.badges?.includes('background_verified') || worker.isVerified;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        press.onPressIn();
        // Company profiles use a different screen/query; only warm individual worker profiles.
        if (!(worker.isCompany || worker.providerType === 'COMPANY')) {
          prefetchWorkerProfile(queryClient, worker.id);
        }
      }}
      onPressOut={press.onPressOut}
      style={[styles.container, press.animatedStyle]}
    >
      <View style={styles.leftColumn}>
        <WorkerAvatar
          uri={worker.avatarUrl || (worker as any)?.avatar || (worker as any)?.avatar_url}
          name={worker.name}
          size={52}
        />
        <View style={styles.onlineBadgeContainer}>
          <OnlineBadge
            status={worker.isBusy ? 'busy' : worker.availabilityStatus === 'AVAILABLE' ? 'online' : 'offline'}
            size={12}
          />
        </View>
      </View>

      <View style={styles.centerColumn}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {isCompany && <CompanyBadge variant="micro" />}
          {isBackgroundVerified && (
            <ShieldCheck size={14} color={colors.primary} />
          )}
        </View>

        {visibleCategories.length > 0 && (
          <View style={styles.chipsRow}>
            {visibleCategories.map((skill: string, idx: number) => (
              <Chip
                key={`${skill}-${idx}`}
                label={skill}
                variant="tag"
                size="xs"
                style={styles.chipStyle}
              />
            ))}
            {overflowCount > 0 && (
              <View style={styles.overflowBadge}>
                <Text style={styles.overflowBadgeText}>+{overflowCount}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.ratingRow}>
            <Text style={styles.starIcon}>★</Text>
            <Text style={styles.ratingText}>{(Number(worker.avgRating) || 0).toFixed(1)}</Text>
            <Text style={styles.reviewsText}> ({worker.totalReviews || 0})</Text>
          </View>
          <Text style={styles.separator}>·</Text>
          {distanceDisplay ? <Text style={styles.distanceText}>{distanceDisplay}</Text> : null}
          {worker.responseTimeMins > 0 && (
            <>
              <Text style={styles.separator}>·</Text>
              <View style={styles.responseRow}>
                <Zap size={11} color={palette.green600} />
                <Text style={styles.responseText}>~{worker.responseTimeMins}m</Text>
              </View>
            </>
          )}
        </View>

        {worker.isBusy && (
          <View style={styles.busyRow}>
            <Text style={styles.busyPillText}>On a job (Book for later)</Text>
          </View>
        )}
      </View>

      <View style={styles.rightColumn}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceUnit}>Starts at</Text>
          <Text style={styles.priceAmount}>{priceFormatted}</Text>
        </View>
        <WorkerAvailabilityBadge
          status={worker.isBusy ? 'BUSY' : worker.availabilityStatus || 'AVAILABLE'}
          size="sm"
        />
      </View>
    </AnimatedPressable>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.bgCard,
    paddingVertical: 14,
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leftColumn: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgSection,
  },
  onlineBadgeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  centerColumn: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  name: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 5,
    overflow: 'hidden',
  },
  chipStyle: {
    maxWidth: 125,
  },
  overflowBadge: {
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowBadgeText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 10.5,
    color: colors.textMuted,
    lineHeight: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 14,
    color: '#F59E0B',
    marginRight: 3,
  },
  ratingText: {
    fontFamily: typography.fontFamily.inter.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  reviewsText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  separator: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: 1,
  },
  distanceText: {
    fontFamily: typography.fontFamily.inter.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  responseText: {
    fontFamily: typography.fontFamily.inter.medium,
    fontSize: 11.5,
    color: palette.green600,
  },
  busyRow: {
    marginTop: 2,
  },
  busyPillText: {
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 11,
    color: palette.amber700,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 2,
    marginLeft: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceUnit: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 10.5,
    color: colors.textMuted,
    lineHeight: 12,
  },
  priceAmount: {
    fontFamily: typography.fontFamily.inter.semiBold,
    fontSize: 13.5,
    color: colors.primary,
  },
});
