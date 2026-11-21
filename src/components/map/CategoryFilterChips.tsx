import { FC, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useMapFilterStore } from '../../store/mapFilter.store';
import { Chip } from '../ui/Chip/Chip';

export interface CategoryOption {
  id: string;
  label: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All workers' },
  { id: 'electrician', label: 'Electrician' },
  { id: 'plumber', label: 'Plumber' },
  { id: 'ac_repair', label: 'AC Repair' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'painter', label: 'Painter' },
  { id: 'carpenter', label: 'Carpenter' },
  { id: 'handyman', label: 'Handyman' },
];

export const CategoryFilterChips: FC = () => {
  const { selectedCategory, setSelectedCategory } = useMapFilterStore();

  const handleSelect = useCallback(
    (id: string) => {
      if (id === 'all') {
        setSelectedCategory(null);
      } else if (selectedCategory === id) {
        setSelectedCategory(null);
      } else {
        setSelectedCategory(id);
      }
    },
    [selectedCategory, setSelectedCategory]
  );

  const activeId = selectedCategory || 'all';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {DEFAULT_CATEGORIES.map((cat) => {
        const isSelected = activeId === cat.id;
        return (
          <Chip
            key={cat.id}
            label={cat.label}
            selected={isSelected}
            variant="filter"
            size="md"
            onPress={() => handleSelect(cat.id)}
            style={styles.chip}
          />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
