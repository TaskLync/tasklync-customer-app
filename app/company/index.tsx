import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Search,
  Star,
  Users,
  Building2,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { useCompanies } from '../../src/hooks/useCompanies';
import { WorkerNearby } from '../../src/types/worker.types';
import { CompanyBadge } from '../../src/components/company/CompanyBadge';
import { CustomRefreshControl } from '../../src/components/feedback/CustomRefreshControl';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { colors } from '../../src/design/colors';
import { companyTokens } from '../../src/theme/companyTokens';

export default function AllCompaniesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { companies, isLoading, isError, refetch } = useCompanies({ limit: 30 });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/' as any);
    }
  };

  const handleCompanyPress = (company: WorkerNearby) => {
    router.push({
      pathname: '/company/[id]',
      params: { id: company.id },
    } as any);
  };

  // Extract unique categories across all companies
  // Extract unique categories across all companies (strictly verified companies only)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    companies
      .filter((c) => c.isCompany === true || c.providerType === 'COMPANY')
      .forEach((c) => {
        c.categories?.forEach((cat) => set.add(cat));
      });
    return ['ALL', ...Array.from(set)];
  }, [companies]);

  // Filtered companies based on search and category
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      // STRICT GUARANTEE: Never render individual solo workers in companies screen
      if (!company.isCompany && company.providerType !== 'COMPANY') {
        return false;
      }

      const name = (company.businessName || company.name || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || name.includes(query) || company.categories.some((c) => c.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === 'ALL' ||
        company.categories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [companies, searchQuery, selectedCategory]);

  const renderCompanyCard = useCallback(
    ({ item }: { item: WorkerNearby }) => {
      const displayName = item.businessName || item.name;
      const initialLetters = displayName
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      return (
        <Pressable
          style={({ pressed }) => [
            styles.cardContainer,
            pressed && styles.cardPressed,
          ]}
          onPress={() => handleCompanyPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, rating ${item.avgRating}`}
        >
          {/* Top row: Logo, Identity, Chevron */}
          <View style={styles.cardHeader}>
            {/* Circular Logo */}
            <View style={styles.logoContainer}>
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={styles.logoImage}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={styles.logoFallback}>
                  <Building2 size={22} color={companyTokens.colors.verifiedBlue} />
                  <Text style={styles.logoFallbackText}>{initialLetters}</Text>
                </View>
              )}
            </View>

            {/* Info Column */}
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.companyName} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>

              <View style={styles.badgeRow}>
                <CompanyBadge
                  variant="micro"
                  label={item.ntnNumber ? 'NTN Verified' : 'Registered Agency'}
                />
                {item.fleetSize ? (
                  <View style={styles.fleetBadge}>
                    <Users size={11} color={colors.textSecondary} />
                    <Text style={styles.fleetText}>{item.fleetSize}+ Technicians</Text>
                  </View>
                ) : null}
              </View>

              {/* Rating & Reviews */}
              <View style={styles.ratingRow}>
                <Star size={13} color={companyTokens.colors.ratingGold} fill={companyTokens.colors.ratingGold} />
                <Text style={styles.ratingText}>
                  {item.avgRating.toFixed(1)}
                </Text>
                <Text style={styles.reviewCountText}>
                  ({item.totalReviews} reviews)
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.distanceText}>{item.distanceLabel || 'Faisalabad'}</Text>
              </View>
            </View>

            <ChevronRight size={18} color={colors.textMuted} style={styles.chevron} />
          </View>

          {/* Categories tags */}
          {item.categories && item.categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {item.categories.slice(0, 3).map((cat, idx) => (
                <View key={`cat-${idx}`} style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{cat}</Text>
                </View>
              ))}
              {item.categories.length > 3 && (
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>+{item.categories.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </Pressable>
      );
    },
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Screen Navigation Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Service Companies</Text>
          <Text style={styles.headerSubtitle}>Vetted corporate partners with doorstep guarantee</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search company or service..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filter Chips */}
      {availableCategories.length > 1 && (
        <View style={styles.filterBar}>
          <FlatList
            data={availableCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterContent}
            renderItem={({ item }) => {
              const isSelected = selectedCategory.toLowerCase() === item.toLowerCase();
              return (
                <Pressable
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextSelected,
                    ]}
                  >
                    {item === 'ALL' ? 'All Providers' : item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* Content List */}
      <View style={styles.listContainer}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={`skel-card-${i}`} style={styles.skeletonCard}>
                <View style={styles.skeletonLogo} />
                <View style={styles.skeletonInfo}>
                  <View style={styles.skeletonBarLong} />
                  <View style={styles.skeletonBarShort} />
                  <View style={styles.skeletonBarMedium} />
                </View>
              </View>
            ))}
          </View>
        ) : isError && filteredCompanies.length === 0 ? (
          <View style={styles.errorContainer}>
            <EmptyState
              title="Unable to load companies"
              subtitle="Please check your connection and tap to retry"
              actionLabel="Retry"
              onAction={refetch}
            />
          </View>
        ) : filteredCompanies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No companies found"
              subtitle={
                searchQuery
                  ? `No service companies matching "${searchQuery}"`
                  : 'Check back soon for new service partners in your area'
              }
              {...(searchQuery ? { actionLabel: 'Clear Search', onAction: () => setSearchQuery('') } : {})}
            />
          </View>
        ) : (
          <FlatList
            data={filteredCompanies}
            renderItem={renderCompanyCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 20, 40) },
            ]}
            refreshControl={
              <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: companyTokens.colors.borderSubtle,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: companyTokens.colors.borderSubtle,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterBar: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: companyTokens.colors.borderSubtle,
  },
  filterChipSelected: {
    backgroundColor: companyTokens.colors.corporatePrimary,
    borderColor: companyTokens.colors.corporatePrimary,
  },
  filterChipText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: colors.white,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: companyTokens.colors.borderSubtle,
    ...companyTokens.shadows.trustCard,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: companyTokens.colors.borderSubtle,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: companyTokens.colors.verifiedBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: companyTokens.colors.verifiedBlueDark,
    marginTop: 1,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  companyName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fleetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bgHover,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fleetText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    color: colors.textPrimary,
  },
  reviewCountText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11.5,
    color: colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  distanceText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  chevron: {
    marginLeft: 6,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryPill: {
    backgroundColor: colors.bgSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: companyTokens.colors.borderSubtle,
    gap: 12,
  },
  skeletonLogo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.bgSkeleton,
  },
  skeletonInfo: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  skeletonBarLong: {
    width: '70%',
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.bgSkeleton,
  },
  skeletonBarShort: {
    width: '40%',
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bgSkeleton,
  },
  skeletonBarMedium: {
    width: '55%',
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bgSkeleton,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
