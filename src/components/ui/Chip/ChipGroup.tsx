import React, { useRef, useEffect } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Chip, ChipProps } from './Chip';

export interface ChipOption {
  label: string;
  value: string;
  icon?: any;
  trailingIcon?: any;
}

interface ChipGroupProps {
  options: ChipOption[];
  selected: string | string[];
  onSelect?: (value: string) => void;
  multiSelect?: boolean;
  scrollable?: boolean;
  chipSize?: ChipProps['size'];
  chipVariant?: ChipProps['variant'];
  chipTone?: ChipProps['tone'];
  paddingH?: number;
  showCheckmark?: boolean;
  onTrailingPress?: (value: string) => void;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  options,
  selected,
  onSelect,
  multiSelect = false,
  scrollable = true,
  chipSize = 'md',
  chipVariant = 'filter',
  chipTone = 'brand',
  paddingH = 16,
  showCheckmark = false, // Changed default to false to prevent layout shifts
  onTrailingPress,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const chipRefs = useRef<{ [key: string]: View | null }>({});

  const isSelected = (value: string) => {
    if (multiSelect && Array.isArray(selected)) {
      return selected.includes(value);
    }
    return selected === value;
  };

  const handleSelect = (value: string) => {
    if (onSelect) {
      onSelect(value);
    }
  };

  useEffect(() => {
    if (scrollable && scrollViewRef.current) {
      // Very basic scroll-into-view logic (could be improved with measureLayout)
      // Just a stub for demonstration as measureLayout is async
      // In a real app, you might track the x-position of each chip and scrollTo it
    }
  }, [selected, scrollable]);

  if (scrollable) {
    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: paddingH, paddingRight: paddingH + 8 }, // Peek effect
        ]}
      >
        {options.map((option) => (
          <View
            key={option.value}
            ref={(ref) => {
              chipRefs.current[option.value] = ref;
            }}
          >
            <Chip
              label={option.label}
              icon={option.icon}
              trailingIcon={option.trailingIcon}
              selected={isSelected(option.value)}
              onPress={() => handleSelect(option.value)}
              onTrailingPress={() => onTrailingPress?.(option.value)}
              size={chipSize}
              variant={chipVariant}
              tone={chipTone}
              showCheckmark={showCheckmark}
            />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrapContainer}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          icon={option.icon}
          trailingIcon={option.trailingIcon}
          selected={isSelected(option.value)}
          onPress={() => handleSelect(option.value)}
          onTrailingPress={() => onTrailingPress?.(option.value)}
          size={chipSize}
          variant={chipVariant}
              tone={chipTone}
          showCheckmark={showCheckmark}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 8,
    flexDirection: 'row',
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
