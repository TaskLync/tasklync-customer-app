import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { CompanyCircleItem } from './CompanyCircleItem';
import { useCompanies } from '../../hooks/useCompanies';
import { WorkerNearby } from '../../types/worker.types';
import { colors } from '../../design/colors';
import { companyTokens } from '../../theme/companyTokens';

const ITEM_GAP = 14;

export const CompanyRow: React.FC = () => {
  const router = useRouter();
  const { companies, isLoading, isError, refetch } = useCompanies({ limit: 10 });
  const isNavigating = useRef(false);

  // Strictly enforce that ONLY genuine companies are rendered in this section
  const verifiedCompanies = React.useMemo(
    () => (companies || []).filter((c) => c.isCompany === true || c.providerType === 'COMPANY'),
    [companies]
  );

  const handleCompanyPress = useCallback((company: WorkerNearby) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setTimeout(() => {
      isNavigating.current = false;
    }, 600);

    router.push({
      pathname: '/company/[id]',
      params: { id: company.id },
    } as any);
  }, [router]);

  const handleSeeAll = useCallback(() => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setTimeout(() => {
      isNavigating.current = false;
    }, 600);

    router.push('/company' as any);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: WorkerNearby }) => (
      <CompanyCircleItem company={item} onPress={handleCompanyPress} />
    ),
    [handleCompanyPress]
  );

  const keyExtractor = useCallback((item: WorkerNearby) => item.id, []);

  const renderSeparator = useCallback(() => <View style={{ width: ITEM_GAP }} />, []);

  // Skeleton placeholder when loading
  const renderSkeletons = () => (
    <View style={styles.skeletonRow}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={`skel-comp-${index}`} style={styles.skeletonItem}>
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonText} />
        </View>
      ))}
    </View>
  );

  const isEmpty = !isLoading && verifiedCompanies.length === 0;

  return (
    <View style={styles.sectionContainer}>
      {/* ── Section Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>Service Companies</Text>
          <Text style={styles.subtitle}>Explore trusted service providers</Text>
        </View>

        <Pressable
          onPress={handleSeeAll}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all service companies"
        >
          <Text style={styles.actionLabel}>See all →</Text>
        </Pressable>
      </View>

      {/* ── Single Horizontal Row ── */}
      <View style={styles.contentContainer}>
        {isLoading ? (
          renderSkeletons()
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrapper}>
                <Building2 size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.emptyTextWrapper}>
                <Text style={styles.emptyTitle}>
                  {isError ? 'Unable to load companies' : 'No service companies yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {isError
                    ? 'Check your connection or tap retry'
                    : 'Registered service partners will appear here'}
                </Text>
              </View>
              {isError && (
                <Pressable
                  onPress={() => refetch()}
                  style={styles.retryBadge}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading companies"
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <FlatList
            data={verifiedCompanies}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={true}
            nestedScrollEnabled={true}
            directionalLockEnabled={true}
            alwaysBounceVertical={false}
            ItemSeparatorComponent={renderSeparator}
            contentContainerStyle={styles.listContent}
            initialNumToRender={4}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    color: colors.primary,
  },
  contentContainer: {
    width: '100%',
  },
  emptyContainer: {
    paddingHorizontal: 16,
    width: '100%',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  emptyIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextWrapper: {
    flex: 1,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  emptySubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6, // Headroom for shadows
    alignItems: 'flex-start',
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: ITEM_GAP,
  },
  skeletonItem: {
    alignItems: 'center',
    width: companyTokens.dimensions.homeItemWidth,
  },
  skeletonCircle: {
    width: companyTokens.dimensions.homeLogoSize,
    height: companyTokens.dimensions.homeLogoSize,
    borderRadius: companyTokens.dimensions.homeLogoRadius,
    backgroundColor: colors.bgSkeleton,
  },
  skeletonText: {
    width: 50,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bgSkeleton,
    marginTop: 8,
  },
  retryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  retryText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
});
