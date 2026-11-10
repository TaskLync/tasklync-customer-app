import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FilterState, ProviderTypeFilter, SortOption } from '../../types/search.types';
import { RadioGroup } from '../ui/Radio';
import { ChipGroup } from '../ui/Chip';
import { StarRatingFilter } from '../ui/Rating/StarRatingFilter';
import { Button } from '../ui/Button/Button';
import { typography } from '../../design/typography';
import { RangeSlider } from '../ui/Slider/RangeSlider';
import { BottomSheetScrollView } from '../layout/BottomSheet';
import { useCategories } from '../../hooks/useCategories';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface FilterSheetContentProps {
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  resultCount: number | null;
  showCategories?: boolean;
  showMaxRate?: boolean;
  showDistance?: boolean;
  showProviderType?: boolean;
  showCity?: boolean;
}

const getSafeFilters = (f?: FilterState): FilterState => ({
  categories: f?.categories ? [...f.categories] : [],
  categoryId: f?.categoryId,
  categoryLabel: f?.categoryLabel,
  city: f?.city,
  minRating: f?.minRating ?? 0,
  minRate: f?.minRate ?? 0,
  maxRate: f?.maxRate ?? 0,
  sortBy: f?.sortBy ?? 'relevance',
  available: f?.available ?? 'any',
  radius: f?.radius ?? 10000,
  provider_type: f?.provider_type ?? 'ALL',
});

const MAJOR_CITIES = [
  { label: 'All Cities', value: '' },
  { label: 'Lahore', value: 'Lahore' },
  { label: 'Faisalabad', value: 'Faisalabad' },
  { label: 'Karachi', value: 'Karachi' },
  { label: 'Islamabad', value: 'Islamabad' },
  { label: 'Rawalpindi', value: 'Rawalpindi' },
];

export const FilterSheetContent: React.FC<FilterSheetContentProps> = ({
  filters,
  onApply,
  onReset,
  resultCount,
  showCategories = true,
  showMaxRate = true,
  showDistance = true,
  showProviderType = true,
  showCity = true,
}) => {
  const styles = useThemedStyles(createStyles);
  const [localFilters, setLocalFilters] = React.useState<FilterState>(() => getSafeFilters(filters));
  const { categories: fetchedCategories } = useCategories();

  React.useEffect(() => {
    setLocalFilters(getSafeFilters(filters));
  }, [filters]);

  const categoryOptions = useMemo(() => {
    if (Array.isArray(fetchedCategories) && fetchedCategories.length > 0) {
      return fetchedCategories.map((c) => ({
        label: c.name,
        value: c.id || c.name,
      }));
    }
    return [];
  }, [fetchedCategories]);

  const handleSortChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...getSafeFilters(prev),
      sortBy: value as SortOption,
    }));
  };

  const handleProviderTypeChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...getSafeFilters(prev),
      provider_type: value as ProviderTypeFilter,
    }));
  };

  const handleCitySelect = (value: string) => {
    setLocalFilters((prev) => ({
      ...getSafeFilters(prev),
      city: value ? value : undefined,
    }));
  };

  const handleCategorySelect = (value: string) => {
    setLocalFilters((prev) => {
      const current = getSafeFilters(prev);
      const isSelected = current.categories.includes(value);
      const updatedCats = isSelected
        ? current.categories.filter((c) => c !== value)
        : [...current.categories, value];

      // Check if selected value matches category id
      const matchedCat = fetchedCategories.find((c) => c.id === value || c.name === value);

      return {
        ...current,
        categories: updatedCats,
        categoryId: matchedCat ? matchedCat.id : undefined,
        categoryLabel: matchedCat ? matchedCat.name : undefined,
      };
    });
  };

  const handleRatingChange = (value: number) => {
    setLocalFilters((prev) => ({ ...getSafeFilters(prev), minRating: value }));
  };

  const handleAvailabilitySelect = (value: string) => {
    setLocalFilters((prev) => ({
      ...getSafeFilters(prev),
      available: value as FilterState['available'],
    }));
  };

  const handleDistanceSelect = (value: string) => {
    setLocalFilters((prev) => ({ ...getSafeFilters(prev), radius: Number(value) }));
  };

  const getApplyLabel = () => {
    if (resultCount === null) return 'Apply Filters';
    if (resultCount === 0) return 'No workers match these filters';
    if (resultCount === 1) return 'Apply (1 worker)';
    return `Apply (${resultCount} workers)`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Filters</Text>
        <Pressable onPress={onReset} hitSlop={12}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Sort by */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sort by</Text>
          <RadioGroup
            options={[
              { label: 'Recommended', value: 'relevance' },
              { label: 'Nearest first', value: 'distance' },
              { label: 'Highest rated', value: 'rating' },
              { label: 'Lowest price', value: 'price_low' },
              { label: 'Highest price', value: 'price_high' },
            ]}
            selected={localFilters.sortBy}
            onChange={handleSortChange}
          />
        </View>

        {/* 2. Provider Type */}
        {showProviderType && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Provider Type</Text>
            <ChipGroup
              options={[
                { label: 'All Providers', value: 'ALL' },
                { label: 'Solo Craftsmen', value: 'INDIVIDUAL' },
                { label: 'Verified Agencies', value: 'COMPANY' },
              ]}
              selected={localFilters.provider_type || 'ALL'}
              onSelect={handleProviderTypeChange}
              multiSelect={false}
              scrollable={false}
              chipSize="sm"
            />
          </View>
        )}

        {/* 3. City Selection */}
        {showCity && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Operating City</Text>
            <ChipGroup
              options={MAJOR_CITIES}
              selected={localFilters.city || ''}
              onSelect={handleCitySelect}
              multiSelect={false}
              scrollable
              chipSize="sm"
              paddingH={0}
            />
          </View>
        )}

        {/* 4. Category Filter */}
        {showCategories && categoryOptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Category</Text>
            <ChipGroup
              options={categoryOptions}
              selected={localFilters.categories}
              onSelect={handleCategorySelect}
              multiSelect
              scrollable
              chipSize="sm"
              paddingH={0}
            />
          </View>
        )}

        {/* 5. Rating Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Minimum rating</Text>
          <StarRatingFilter
            value={localFilters.minRating}
            onChange={handleRatingChange}
          />
        </View>

        {/* 6. Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Availability</Text>
          <ChipGroup
            options={[
              { label: 'Any time', value: 'any' },
              { label: 'Available now', value: 'now' },
              { label: 'Today', value: 'today' },
            ]}
            selected={localFilters.available}
            onSelect={handleAvailabilitySelect}
            multiSelect={false}
            scrollable={false}
          />
        </View>

        {/* 7. Maximum Distance */}
        {showDistance && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Maximum Distance</Text>
            <ChipGroup
              options={[
                { label: 'Within 5 km', value: '5000' },
                { label: 'Within 10 km', value: '10000' },
                { label: 'Within 25 km', value: '25000' },
                { label: 'All Distances (50 km)', value: '50000' },
              ]}
              selected={String(localFilters.radius || 10000)}
              onSelect={handleDistanceSelect}
              multiSelect={false}
              scrollable={false}
              chipSize="sm"
              paddingH={0}
            />
          </View>
        )}

        {/* 8. Price Range */}
        {showMaxRate && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Price Range (PKR)</Text>
            <RangeSlider
              min={100}
              max={15000}
              step={200}
              value={[localFilters.minRate || 100, localFilters.maxRate || 15000]}
              onChange={(val) => {
                setLocalFilters((prev) => ({
                  ...getSafeFilters(prev),
                  minRate: val[0],
                  maxRate: val[1],
                }));
              }}
            />
          </View>
        )}
      </BottomSheetScrollView>

      <View style={styles.footer}>
        <Button
          label={getApplyLabel()}
          onPress={() => onApply(localFilters)}
          variant={resultCount === 0 ? 'secondary' : 'primary'}
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  resetText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 24,
    paddingBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
