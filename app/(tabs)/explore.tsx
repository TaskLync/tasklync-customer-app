import { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Keyboard } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, useSharedValue } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { SearchHeader } from '../../src/components/home/SearchHeader';
import { BottomSheet, BottomSheetRef } from '../../src/components/layout/BottomSheet';
import { FilterSheetContent } from '../../src/components/search/FilterSheetContent';
import { RecentSearchesSection } from '../../src/components/search/RecentSearchesSection';
import { AutocompleteDropdown } from '../../src/components/search/AutocompleteDropdown';
import { SearchChip } from '../../src/components/search/SearchChip';
import type { SearchBarRef } from '../../src/components/search/SearchBar';
import { WorkerListRow, WorkerListRowSkeleton } from '../../src/components/worker/WorkerListRow';
import { SkeletonGroup } from '../../src/components/ui/Skeleton';
import { Chip } from '../../src/components/ui/Chip';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { useSearch } from '../../src/hooks/useSearch';
import { useRecentSearches } from '../../src/hooks/useRecentSearches';
import { useCategories } from '../../src/hooks/useCategories';
import { useCustomerCoords } from '../../src/hooks/useCustomerCoords';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { typography } from '../../src/design/typography';
import { AutocompleteSuggestion, DEFAULT_FILTERS, FilterState } from '../../src/types/search.types';
import type { WorkerNearby } from '../../src/types/worker.types';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { DEFAULT_RADIUS, SORT_LABELS, describePriceRange, formatDistance } from '../../src/utils/searchFilters';

/**
 * Explore: one list, two modes.
 *  - Browse (no query, no filters): recent searches, trending, categories, then professionals near
 *    the customer from the same search endpoint, so the screen is never an empty white page.
 *  - Results (query >= 2 chars or any filter): category row, applied filters, count, results.
 * Query and filters are independent state in useSearch: opening / closing filters never touches
 * the query, and filters are sent as structured params, never folded into the text.
 */
export default function ExploreScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const scrollY = useSharedValue(0);
  const filterSheetRef = useRef<BottomSheetRef>(null);
  const hasLocation = useCustomerCoords() !== null;

  // Arriving from the Home search bar (`focus=1`): put the cursor in the field once, then drop
  // the param so later visits to this tab don't pop the keyboard again.
  const searchRef = useRef<SearchBarRef>(null);
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  useEffect(() => {
    if (focus !== '1') return;
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    router.setParams({ focus: undefined } as any);
    return () => clearTimeout(t);
  }, [focus, router]);

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
    isTotalPartial,
    isLoading,
    isLoadingMore,
    isPlaceholderData,
    isError,
    refetch,
    hasMore,
    loadMore,
    clearSearch,
    hasSearchIntent,
  } = useSearch({ browseWhenIdle: true });

  const { searches, addSearch, removeSearch, clearAll } = useRecentSearches();
  const { categories: fetchedCategories } = useCategories();
  const categories = Array.isArray(fetchedCategories) ? fetchedCategories.filter((c) => c?.name) : [];

  const runSearch = useCallback(
    (term: string) => {
      setQuery(term);
      addSearch(term);
      Keyboard.dismiss();
    },
    [setQuery, addSearch]
  );

  const handleSubmit = useCallback(() => {
    const term = query.trim();
    if (term.length >= 2) addSearch(term);
    Keyboard.dismiss();
  }, [query, addSearch]);

  const onSelectSuggestion = useCallback(
    (item: AutocompleteSuggestion) => {
      if (item.type === 'category') {
        handleSelectSuggestion(item);
        addSearch(item.label);
        Keyboard.dismiss();
      } else if (item.type === 'worker' && item.worker_id) {
        addSearch(item.label);
        router.push(`/worker/${item.worker_id}` as any);
      }
    },
    [handleSelectSuggestion, addSearch, router]
  );

  const isCategorySelected = (c: { id?: string; name: string }) =>
    (Boolean(c.id) && filters.categoryId === c.id) || (!filters.categoryId && filters.categories[0] === c.name);

  const toggleCategory = (c: { id?: string; name: string }) => {
    if (isCategorySelected(c)) {
      setFilters((prev) => ({ ...prev, categoryId: undefined, categoryLabel: undefined, categories: [] }));
    } else {
      setFilters((prev) => ({ ...prev, categoryId: c.id || undefined, categoryLabel: c.name, categories: [c.name] }));
    }
  };

  // Remounting the sheet per open seeds its draft from the APPLIED filters. Nothing reaches the
  // search until "Apply Filters"; the text query is untouched either way.
  const [filterSheetKey, setFilterSheetKey] = useState(0);
  const openFilters = useCallback(() => {
    Keyboard.dismiss();
    setFilterSheetKey((k) => k + 1);
    filterSheetRef.current?.open();
  }, []);

  const handleFilterApply = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      filterSheetRef.current?.close();
    },
    [setFilters]
  );

  const removeFilter = (key: keyof FilterState | 'price') => {
    if (key === 'price') setFilters((prev) => ({ ...prev, minRate: 0, maxRate: 0 }));
    else setFilters((prev) => ({ ...prev, [key]: DEFAULT_FILTERS[key as keyof FilterState] }));
  };

  /* ─────────────── Header pieces ─────────────── */

  const renderAppliedFilters = () => {
    const priceLabel = describePriceRange(filters);
    const items: { key: keyof FilterState | 'price'; label: string }[] = [];
    if (filters.available === 'now') items.push({ key: 'available', label: 'Available now' });
    if ((filters.radius ?? DEFAULT_RADIUS) !== DEFAULT_RADIUS)
      items.push({ key: 'radius', label: `Within ${formatDistance(filters.radius ?? DEFAULT_RADIUS)}` });
    if (filters.minRating > 0) items.push({ key: 'minRating', label: `${filters.minRating}★ & up` });
    if (priceLabel) items.push({ key: 'price', label: priceLabel });
    if (filters.sortBy !== 'relevance') items.push({ key: 'sortBy', label: SORT_LABELS[filters.sortBy] });
    if (filters.provider_type && filters.provider_type !== 'ALL' && filters.provider_type !== 'ANY')
      items.push({ key: 'provider_type', label: filters.provider_type === 'COMPANY' ? 'Agencies' : 'Solo craftsmen' });
    if (items.length === 0) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll} style={styles.appliedRow}>
        {items.map((i) => (
          <Chip
            key={i.key}
            label={i.label}
            variant="tag"
            size="sm"
            trailingIcon={X}
            onTrailingPress={() => removeFilter(i.key)}
            style={styles.appliedChip}
          />
        ))}
      </ScrollView>
    );
  };

  const renderBrowseHeader = () => (
    <Animated.View entering={FadeIn.duration(180)}>
      <RecentSearchesSection searches={searches} onSelect={runSearch} onRemove={removeSearch} onClearAll={clearAll} />

      {trendingTerms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Trending
          </Text>
          <View style={styles.wrap}>
            {trendingTerms.slice(0, 8).map((t, i) => (
              <SearchChip key={`${t.term}-${i}`} label={t.term} onPress={() => runSearch(t.term)} accessibilityLabel={`Search for ${t.term}`} />
            ))}
          </View>
        </View>
      )}

      {categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Browse by category
          </Text>
          <View style={styles.wrap}>
            {categories.map((c) => (
              <SearchChip key={c.id || c.name} label={c.name} selected={isCategorySelected(c)} onPress={() => toggleCategory(c)} />
            ))}
          </View>
        </View>
      )}

      <View style={[styles.section, styles.listTitleRow]}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {hasLocation ? 'Professionals near you' : 'Popular professionals'}
        </Text>
      </View>
    </Animated.View>
  );

  const renderResultsHeader = () => (
    <Animated.View entering={FadeIn.duration(180)}>
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll} style={styles.categoryRow}>
          {categories.map((c) => (
            <SearchChip key={c.id || c.name} label={c.name} selected={isCategorySelected(c)} onPress={() => toggleCategory(c)} />
          ))}
        </ScrollView>
      )}
      {renderAppliedFilters()}
      {!isLoading && !isError && workers.length > 0 && (
        <Text style={styles.count} maxFontSizeMultiplier={1.3}>
          {isPlaceholderData
            ? 'Updating results…'
            : filters.available === 'now'
            ? `${total}${isTotalPartial ? '+' : ''} available now`
            : `${total} ${total === 1 ? 'professional' : 'professionals'}`}
        </Text>
      )}
    </Animated.View>
  );

  /* ─────────────── Body states ─────────────── */

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <SkeletonGroup accessibilityLabel="Loading professionals">
          {[1, 2, 3, 4, 5].map((i) => (
            <WorkerListRowSkeleton key={i} />
          ))}
        </SkeletonGroup>
      );
    }
    if (isError) {
      return (
        <EmptyState
          type={isOffline ? 'no-internet' : 'server-error'}
          title={isOffline ? 'You’re offline' : 'Couldn’t load professionals'}
          description={isOffline ? 'Check your connection and try again.' : 'Something went wrong on our side. Please try again.'}
          onAction={() => void refetch()}
          actionLabel="Try again"
          actionVariant="neutral"
          style={styles.emptyState}
        />
      );
    }
    if (!hasSearchIntent) {
      return (
        <EmptyState
          type="no-workers"
          title="No professionals nearby yet"
          description="Search for a service or pick a category above."
          showAction={false}
          style={styles.emptyState}
        />
      );
    }
    const filtered = activeFilterCount > 0;
    return (
      <View style={styles.emptyState}>
        <EmptyState
          type="no-workers"
          title={filtered ? 'No matching professionals found' : 'No results'}
          description={
            filtered
              ? 'Try adjusting your filters to discover more professionals.'
              : 'Try a different word, like a service or a worker’s name.'
          }
          actionVariant="neutral"
          actionLabel={filtered ? 'Adjust filters' : 'Clear search'}
          onAction={filtered ? openFilters : clearSearch}
        />
        {filtered && (
          <Pressable onPress={resetFilters} hitSlop={10} style={styles.clearFiltersLink} accessibilityRole="button">
            <Text style={styles.clearFiltersText}>Clear all filters</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: WorkerNearby; index: number }) => (
      <View style={isPlaceholderData ? styles.stale : undefined}>
        <WorkerListRow worker={item} isLast={index === workers.length - 1 && !isLoadingMore} />
      </View>
    ),
    [isPlaceholderData, styles.stale, workers.length, isLoadingMore]
  );

  const showSuggestionsDropdown = query.trim().length >= 2 && suggestions.length > 0;

  return (
    <View style={styles.container}>
      <SearchHeader
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        onSubmit={handleSubmit}
        activeFilterCount={activeFilterCount}
        onFilterPress={openFilters}
        scrollY={scrollY}
        searchRef={searchRef}
      />

      {showSuggestionsDropdown && (
        <AutocompleteDropdown suggestions={suggestions} onSelect={onSelectSuggestion} visible={showSuggestionsDropdown} />
      )}

      <View style={styles.listContainer}>
        <FlashList
          data={isLoading || isError ? [] : workers}
          extraData={isPlaceholderData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          // @ts-ignore FlashList v1 prop, ignored by v2
          estimatedItemSize={88}
          contentContainerStyle={styles.listContent}
          onScroll={(e) => {
            scrollY.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={() => {
            if (hasMore && !isLoadingMore) loadMore();
          }}
          onEndReachedThreshold={0.7}
          ListHeaderComponent={hasSearchIntent ? renderResultsHeader() : renderBrowseHeader()}
          ListEmptyComponent={renderEmpty()}
          ListFooterComponent={
            isLoadingMore ? (
              <SkeletonGroup accessibilityLabel="Loading more professionals">
                {[1, 2].map((i) => (
                  <WorkerListRowSkeleton key={i} />
                ))}
              </SkeletonGroup>
            ) : null
          }
        />
      </View>

      <BottomSheet ref={filterSheetRef} snapPoints={['88%']} contentPadding={false}>
        <FilterSheetContent key={filterSheetKey} filters={filters} onApply={handleFilterApply} />
      </BottomSheet>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgCard,
    },
    listContainer: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 32,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    sectionTitle: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 15.5,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    listTitleRow: {
      paddingTop: 28,
    },
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    hScroll: {
      paddingHorizontal: 20,
      gap: 8,
    },
    categoryRow: {
      paddingTop: 4,
      flexGrow: 0,
    },
    appliedRow: {
      paddingTop: 10,
      flexGrow: 0,
    },
    appliedChip: {
      backgroundColor: colors.bgSection,
    },
    count: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 13,
      color: colors.textMuted,
    },
    stale: {
      opacity: 0.45,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 48,
      paddingHorizontal: 32,
    },
    clearFiltersLink: {
      marginTop: 4,
      paddingVertical: 8,
    },
    clearFiltersText: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 13.5,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
  });
