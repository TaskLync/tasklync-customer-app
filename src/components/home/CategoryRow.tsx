import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import {
  AcIcon,
  DropletIcon,
  FlashIcon,
  GridIcon,
  HammerIcon,
  PainterIcon,
  SparklesIcon,
} from '../ui/Icon/icons';
import { Category } from '../../types/category.types';
import { Chip } from '../ui/Chip/Chip';

interface CategoryRowProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category | null) => void;
  includeAll?: boolean;
  style?: ViewStyle;
}

const CATEGORY_ICON_MAP: Record<string, any> = {
  electrician: FlashIcon,
  plumber: DropletIcon,
  ac_repair: AcIcon,
  cleaning: SparklesIcon,
  carpenter: HammerIcon,
  painter: PainterIcon,
};

export const CategoryRow: React.FC<CategoryRowProps> = ({
  categories,
  selectedId,
  onSelect,
  includeAll = true,
  style,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // We can add simple scroll-to-active logic if desired.
  // In Expo/React Native, we can also let the ScrollView flow naturally.

  const handleSelect = (category: Category | null) => {
    onSelect(category);
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
    >
      {includeAll && (
        <Chip
          label="All"
          selected={selectedId === null}
          onPress={() => handleSelect(null)}
          size="md"
          variant="filter"
          showCheckmark={false}
          icon={GridIcon}
        />
      )}

      {categories.map((category) => {
        const IconComponent = CATEGORY_ICON_MAP[category.id] || GridIcon;
        return (
          <Chip
            key={category.id}
            label={category.name}
            selected={category.id === selectedId}
            onPress={() => handleSelect(category)}
            size="md"
            variant="filter"
            showCheckmark={false}
            icon={IconComponent}
          />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 52,
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
});
