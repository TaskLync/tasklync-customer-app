import { useRef, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { SearchHeader } from '../../src/components/home/SearchHeader';
import { BottomSheet, BottomSheetRef } from '../../src/components/layout/BottomSheet';
import { FilterSheetContent } from '../../src/components/search/FilterSheetContent';
import { RecentSearchesSection } from '../../src/components/search/RecentSearchesSection';
import { TrendingSearchChips } from '../../src/components/search/TrendingSearchChips';
import { AutocompleteDropdown } from '../../src/components/search/AutocompleteDropdown';
import { WorkerListRow, WorkerListRowSkeleton } from '../../src/components/worker/WorkerListRow';
import { SkeletonGroup } from '../../src/components/ui/Skeleton';
import { ChipGroup, Chip } from '../../src/components/ui/Chip';
import { ProviderTypeFilterChips } from '../../src/components/search/ProviderTypeFilterChips';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { useSearch } from '../../src/hooks/useSearch';
import { useRecentSearches } from '../../src/hooks/useRecentSearches';
import { useCategories } from '../../src/hooks/useCategories';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { colors } from '../../src/design/colors';
import { typography } from '../../src/design/typography';
import { AutocompleteSuggestion, DEFAULT_FILTERS, FilterState } from '../../src/types/search.types';
import { X } from 'lucide-react-native';

export default function ExploreScreen() {
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const scrollY = useSharedValue(0);
  const filterSheetRef = useRef<BottomSheetRef>(null);

  const {
    query,
    setQuery,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    suggestions,
    handleSelectSuggestion,
    trendingTerms,
    workers,
    total,
    isLoading,
    isLoadingMore,
    isError,
    refetch,
    hasMore,
    loadMore,
    clearSearch,
    hasSearchIntent,
  } = useSearch();

  const { searches, addSearch, removeSearch, clearAll } = useRecentSearches();
  const { categories: fetchedCategories } = useCategories();

  const categoryChipOptions =
    Array.isArray(fetchedCategories) && fetchedCategories.length > 0
      ? fetchedCategories.slice(0, 8).map((c) => ({ label: c.name, value: c.id || c.name }))
      : [];

  const handleSelectRecent = useCallback(
    (term: string) => {
      setQuery(term);
      addSearch(term);
    },
    [setQuery, addSearch]
  );

  const handleSelectTrending = useCallback(
    (term: string) => {
      setQuery(term);
      addSearch(term);
    },
    [setQuery, addSearch]
  );

  const onSelectSuggestion = useCallback(
    (item: AutocompleteSuggestion) => {
      if (item.type === 'category') {
        handleSelectSuggestion(item);
        addSearch(item.label);
      } else if (item.type === 'worker' && item.worker_id) {
        addSearch(item.label);
        router.push(`/worker/${item.worker_id}` as any);
      }
    },
    [handleSelectSuggestion, addSearch, router]
  );

  const handleFilterApply = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      filterSheetRef.current?.close();
    },
    [setFilters]
  );

  const handleFilterReset = useCallback(() => {
    resetFilters();
    filterSheetRef.current?.close();
  }, [resetFilters]);

  const removeFilter = (key: keyof FilterState, value?: string) => {
    if (key === 'categories' && value) {
      setFilters((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c !== value),
        categoryId: undefined,
        categoryLabel: undefined,
      }));
    } else if (key === 'categoryId') {
      setFilters((prev) => ({
        ...prev,
        categoryId: undefined,
        categoryLabel: undefined,
        categories: [],
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: DEFAULT_FILTERS[key],
      }));
    }
  };

  const renderActiveFilters = () => {
    if (activeFilterCount === 0) return null;

    const safeCategories = filters.categories || [];

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersScroll}
        >
          {filters.categoryLabel ? (
            <Chip
              key="cat-id"
              label={`Category: ${filters.categoryLabel}`}
              variant="tag"
              size="sm"
              trailingIcon={X}
              onTrailingPress={() => removeFilter('categoryId')}
              style={styles.activeFilterChip}
            />
          ) : (
            safeCategories.map((cat) => (
              <Chip
                key={cat}
                label={`Category: ${cat}`}
                variant="tag"
                size="sm"
                trailingIcon={X}
                onTrailingPress={() => removeFilter('categories', cat)}
                style={styles.activeFilterChip}
              />
            ))
          )}

          {filters.city && (
            <Chip
              key="city"
              label={`City: ${filters.city}`}
              variant="tag"
              size="sm"
              trailingIcon={X}
              onTrailingPress={() => removeFilter('city')}
              style={styles.activeFilterChip}
            />
          )}

          {filters.minRating > 0 && (
            <Chip
              key="rating"
              label={`${filters.minRating}★ & up`}
              variant="tag"
              size="sm"
              trailingIcon={X}
              onTrailingPress={() => removeFilter('minRating')}
              style={styles.activeFilterChip}
            />
          )}

          {filters.maxRate > 0 && (
            <Chip
              key="price"
              label={`Under Rs ${filters.maxRate.toLocaleString()}`}
              variant="tag"
              size="sm"
              trailingIcon={X}
              onTrailingPress={() => removeFilter('maxRate')}
              style={styles.activeFilterChip}
            />
          )}

          {filters.sortBy !== 'relevance' && (
            <Chip
              key="sort"
              label={`Sort: ${filters.sortBy === 'distance' ? 'Nearest' : filters.sortBy === 'rating' ? 'Top Rated' : 'Price'}`}
              variant="tag"
              size="sm"
              trailingIcon={X}
              onTrailingPress={() => removeFilter('sortBy')}
              style={styles.activeFilterChip}
            />
          )}

          {filters.provider_type && filters.provider_type !== 'ALL' && (
            <Chip
              key="provider"
              label={filters.provider_type === 'COMPANY' ? 'Agencies only' : 'Solo Handymen'}
              variant="tag"
              size="sm"
              trailingIcon={X}
              onTrailingPress={() => removeFilter('provider_type')}
              style={styles.activeFilterChip}
            />
          )}
        </ScrollView>
      </View>
    );
  };

  const renderEmptyQueryState = () => {
    return (
      <View style={styles.emptyQueryContainer}>
        {/* 1. Recent Searches */}
        <RecentSearchesSection
          searches={searches}
          onSelect={handleSelectRecent}
          onRemove={removeSearch}
          onClearAll={clearAll}
        />

        {/* 2. Trending Searches from Search Service */}
        <TrendingSearchChips
          terms={trendingTerms}
          onSelect={handleSelectTrending}
        />

        {/* 3. Browse by Category */}
        {categoryChipOptions.length > 0 && (
          <View style={styles.browseSection}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <ChipGroup
              options={categoryChipOptions}
              selected={filters.categoryLabel || ''}
              onSelect={(cat) => {
                const matched = fetchedCategories.find((c) => c.name === cat || c.id === cat);
                if (matched) {
                  setFilters((prev) => ({
                    ...prev,
                    categoryId: matched.id,
                    categoryLabel: matched.name,
                    categories: [matched.name],
                  }));
                } else {
                  setQuery(cat);
                }
                addSearch(cat);
              }}
              multiSelect={false}
              scrollable={false}
            />
          </View>
        )}
      </View>
    );
  };

  const renderEmptyResults = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyResultsContainer}>
        <EmptyState
          type="no-workers"
          title="No service providers found"
          description="Try searching for something else, checking spelling, or clearing some filters."
          actionLabel={activeFilterCount > 0 ? 'Reset Filters' : 'Clear Search'}
          onAction={() => {
            if (activeFilterCount > 0) {
              resetFilters();
            } else {
              clearSearch();
            }
          }}
        />
      </View>
    );
  };

  const showSuggestionsDropdown = query.trim().length >= 2 && suggestions.length > 0;

  return (
    <View style={styles.container}>
      <SearchHeader
        value={query}
        onChangeText={setQuery}
        onClear={clearSearch}
        activeFilterCount={activeFilterCount}
        onFilterPress={() => filterSheetRef.current?.open()}
        scrollY={scrollY}
        placeholder="Search electrician, AC repair, mistri..."
      />

      {/* Autocomplete Dropdown */}
      {showSuggestionsDropdown && (
        <AutocompleteDropdown
          suggestions={suggestions}
          onSelect={onSelectSuggestion}
          visible={showSuggestionsDropdown}
        />
      )}

      {renderActiveFilters()}

      {!hasSearchIntent ? (
        <ScrollView
          style={styles.listContainer}
          onScroll={(e) => {
            scrollY.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {renderEmptyQueryState()}
        </ScrollView>
      ) : (
        <View style={styles.listContainer}>
          <FlashList
            data={workers}
            renderItem={({ item, index }) => (
              <WorkerListRow worker={item} isLast={index === workers.length - 1 && !isLoadingMore} />
            )}
            keyExtractor={(item) => item.id}
            // @ts-ignore
            estimatedItemSize={88}
            contentContainerStyle={styles.flashListContent}
            onScroll={(e) => {
              scrollY.value = e.nativeEvent.contentOffset.y;
            }}
            onEndReached={() => {
              if (hasMore && !isLoadingMore) loadMore();
            }}
            onEndReachedThreshold={0.7}
            ListHeaderComponent={
              !isLoading ? (
                <View style={styles.resultsHeader}>
                  <ProviderTypeFilterChips
                    selected={(filters.provider_type as any) || 'ALL'}
                    onSelect={(val) => setFilters((prev) => ({ ...prev, provider_type: val }))}
                  />
                  <Text style={styles.resultsCount}>
                    {total} {total === 1 ? 'provider' : 'providers'} found
                  </Text>
                  <View style={styles.sortRow}>
                    <ChipGroup
                      options={[
                        { label: 'Recommended', value: 'relevance' },
                        { label: 'Nearest', value: 'distance' },
                        { label: 'Top Rated', value: 'rating' },
                        { label: 'Lowest Price', value: 'price_low' },
                      ]}
                      selected={filters.sortBy}
                      onSelect={(val) =>
                        setFilters((prev) => ({ ...prev, sortBy: val as any }))
                      }
                      scrollable
                      paddingH={0}
                      chipSize="sm"
                    />
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              isLoading ? (
                <SkeletonGroup style={styles.skeletonContainer} accessibilityLabel="Loading results">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <WorkerListRowSkeleton key={i} />
                  ))}
                </SkeletonGroup>
              ) : isError ? (
                <EmptyState
                  type={isOffline ? 'no-internet' : 'server-error'}
                  title={isOffline ? 'No Internet Connection' : "Couldn't load search results"}
                  description={
                    isOffline
                      ? 'Please check your connection and tap retry.'
                      : 'An unexpected error occurred while loading search results. Please try again.'
                  }
                  onAction={refetch}
                  actionLabel="Retry"
                  style={{ paddingVertical: 40 }}
                />
              ) : (
                renderEmptyResults()
              )
            }
            ListFooterComponent={
              isLoadingMore ? (
                <SkeletonGroup style={styles.skeletonContainer} accessibilityLabel="Loading results">
                  {[1, 2].map((i) => (
                    <WorkerListRowSkeleton key={i} />
                  ))}
                </SkeletonGroup>
              ) : null
            }
          />
        </View>
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheet
        ref={filterSheetRef}
        snapPoints={['88%']}
        contentPadding={false}
      >
        <FilterSheetContent
          filters={filters}
          onApply={handleFilterApply}
          onReset={handleFilterReset}
          resultCount={total}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  activeFiltersContainer: {
    backgroundColor: colors.bgCard,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeFiltersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activeFilterChip: {
    backgroundColor: colors.bgSection,
  },
  listContainer: {
    flex: 1,
  },
  emptyQueryContainer: {
    paddingBottom: 40,
  },
  browseSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  flashListContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  resultsHeader: {
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  resultsCount: {
    fontFamily: typography.fontFamily.inter.medium,
    fontSize: 13,
    color: colors.textMuted,
    marginVertical: 10,
  },
  sortRow: {
    marginBottom: 4,
  },
  skeletonContainer: {
  },
  emptyResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
