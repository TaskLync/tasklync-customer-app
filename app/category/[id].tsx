import { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@design/colors';
import { typography } from '@design/typography';
import { useCategoryById } from '@hooks/useCategories';
import { CategoryFilterBar, CategoryWorkersList, DistanceSheetContent } from '@components/category';
import { BottomSheet, BottomSheetRef } from '@components/layout/BottomSheet';
import { FilterSheetContent } from '@components/search/FilterSheetContent';
import { FilterState, SortOption, DEFAULT_FILTERS } from '../../src/types/search.types';

import { formatCategoryName } from '../../src/utils/formatters';

export default function CategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Array.isArray(id) ? id[0] : id;

  // Fetch Category info (for formatted display title)
  const { category } = useCategoryById(categoryId || '');

  // Screen States
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    categories: categoryId ? [categoryId] : [],
    radius: 10000,
  });

  const filterSheetRef = useRef<BottomSheetRef>(null);
  const distanceSheetRef = useRef<BottomSheetRef>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/' as any);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setFilters((prev) => ({ ...prev, sortBy: newSort }));
  };

  const handleRemoveFilter = (key: keyof FilterState) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (key === 'minRating') updated.minRating = 0;
      if (key === 'maxRate') updated.maxRate = 0;
      if (key === 'available') updated.available = 'any';
      if (key === 'radius') updated.radius = 10000;
      return updated;
    });
  };

  const handleOpenFilters = () => {
    filterSheetRef.current?.open();
  };

  const handleOpenDistance = () => {
    distanceSheetRef.current?.open();
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setSortBy(newFilters.sortBy);
    filterSheetRef.current?.close();
  };

  const handleResetFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      categories: categoryId ? [categoryId] : [],
      radius: 10000,
    });
    setSortBy('distance');
    filterSheetRef.current?.close();
  };

  const handleApplyDistance = (newRadius: number, newSort: SortOption) => {
    setFilters((prev) => ({ ...prev, radius: newRadius, sortBy: newSort }));
    setSortBy(newSort);
    distanceSheetRef.current?.close();
  };

  const handleResetDistance = () => {
    setFilters((prev) => ({ ...prev, radius: 10000, sortBy: 'distance' }));
    setSortBy('distance');
    distanceSheetRef.current?.close();
  };

  const categoryName = category?.name || formatCategoryName(categoryId, 'Category', 'title');

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.bgApp}
      />

      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft
            size={24}
            color={colors.primary}
          />
        </Pressable>
        <Text
          style={styles.headerTitle}
          numberOfLines={1}
        >
          {categoryName}
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Filter Bar */}
      <CategoryFilterBar
        sortBy={sortBy}
        onSortChange={handleSortChange}
        activeFilters={filters}
        onRemoveFilter={handleRemoveFilter}
        onOpenFilters={handleOpenFilters}
        onOpenDistance={handleOpenDistance}
      />

      {/* Content Area - Category Workers List */}
      <View style={styles.content}>
        <CategoryWorkersList
          categoryId={categoryId || ''}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          maxRate={filters.maxRate}
          minRating={filters.minRating}
          available={filters.available}
          radius={filters.radius || 10000}
        />
      </View>

      {/* Filters Bottom Sheet */}
      <BottomSheet
        ref={filterSheetRef}
        snapPoints={['85%']}
        contentPadding={false}
      >
        <FilterSheetContent
          filters={filters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          resultCount={null}
          showCategories={false}
          showMaxRate={true}
          showDistance={true}
        />
      </BottomSheet>

      {/* Distance & Coverage Bottom Sheet */}
      <BottomSheet
        ref={distanceSheetRef}
        snapPoints={['55%']}
        contentPadding={false}
      >
        <DistanceSheetContent
          currentRadius={filters.radius || 10000}
          currentSort={sortBy}
          onApply={handleApplyDistance}
          onReset={handleResetDistance}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgApp,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
});
