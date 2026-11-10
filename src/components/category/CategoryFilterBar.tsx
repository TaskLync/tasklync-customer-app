import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { SlidersHorizontal, X, MapPin } from 'lucide-react-native';
import { Chip } from '../ui/Chip/Chip';
import { SortOption, FilterState } from '../../types/search.types';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CategoryFilterBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeFilters: FilterState;
  onRemoveFilter: (key: keyof FilterState) => void;
  onOpenFilters: () => void;
  onOpenDistance?: () => void;
  style?: ViewStyle;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  sortBy,
  onSortChange,
  activeFilters,
  onRemoveFilter,
  onOpenFilters,
  onOpenDistance,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  // Determine active filter chips
  const activeChips: Array<{ key: keyof FilterState; label: string }> = [];

  if (activeFilters.radius && activeFilters.radius !== 10000) {
    activeChips.push({
      key: 'radius',
      label: activeFilters.radius >= 50000 ? 'All Distances' : `Within ${activeFilters.radius / 1000} km`,
    });
  }

  if (activeFilters.minRating > 0) {
    activeChips.push({
      key: 'minRating',
      label: `Min ${activeFilters.minRating}★`,
    });
  }

  if (activeFilters.maxRate > 0) {
    activeChips.push({
      key: 'maxRate',
      label: `Under Rs ${activeFilters.maxRate.toLocaleString()}`,
    });
  }

  if (activeFilters.available !== 'any') {
    activeChips.push({
      key: 'available',
      label: activeFilters.available === 'now' ? 'Available Now' : 'Available Today',
    });
  }

  const hasActiveFilters = activeChips.length > 0;

  const handleSortPress = (sort: SortOption) => {
    if (sortBy !== sort) {
      onSortChange(sort);
    }
  };

  const handleRemove = (key: keyof FilterState) => {
    onRemoveFilter(key);
  };

  return (
    <View style={[styles.outerContainer, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Distance Button / Chip */}
        <Chip
          label={
            activeFilters.radius && activeFilters.radius !== 10000
              ? activeFilters.radius >= 50000
                ? 'All Distances'
                : `Within ${activeFilters.radius / 1000} km`
              : 'Distance'
          }
          selected={activeFilters.radius !== undefined && activeFilters.radius !== 10000}
          onPress={onOpenDistance || (() => handleSortPress('distance'))}
          size="sm"
          variant="filter"
          showCheckmark={false}
          icon={MapPin}
        />

        {/* Sort Chips */}
        <Chip
          label="Nearest"
          selected={sortBy === 'distance'}
          onPress={() => handleSortPress('distance')}
          size="sm"
          variant="filter"
          showCheckmark={false}
        />
        <Chip
          label="Top Rated"
          selected={sortBy === 'rating'}
          onPress={() => handleSortPress('rating')}
          size="sm"
          variant="filter"
          showCheckmark={false}
        />
        <Chip
          label="Lowest Price"
          selected={sortBy === 'price_low'}
          onPress={() => handleSortPress('price_low')}
          size="sm"
          variant="filter"
          showCheckmark={false}
        />

        {/* Separator if active filters exist */}
        {hasActiveFilters && <View style={styles.separator} />}

        {/* Active Filter Chips */}
        {activeChips.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            selected={true}
            size="sm"
            variant="filter"
            showCheckmark={false}
            trailingIcon={X}
            onTrailingPress={() => handleRemove(chip.key)}
          />
        ))}

        {/* Filter Button */}
        <Chip
          label={activeChips.length > 0 ? `Filters (${activeChips.length})` : 'Filters'}
          onPress={onOpenFilters}
          size="sm"
          variant="tag"
          icon={SlidersHorizontal}
        />
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  outerContainer: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
    marginHorizontal: 4,
  },
});
