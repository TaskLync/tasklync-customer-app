import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ViewStyle,
} from 'react-native';
import { ChevronDown, MapPin, Star, ArrowDownAZ } from 'lucide-react-native';
import { typography } from '../../../design/typography';
import { ActionSheet, ActionItem } from '../../layout/ActionSheet/ActionSheet';
import { SortOption } from '../../../types/search.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

interface SortDropdownProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  style?: ViewStyle;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  currentSort,
  onSortChange,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [isVisible, setIsVisible] = useState(false);

  const getSortLabel = (sort: SortOption): string => {
    switch (sort) {
      case 'relevance':
        return 'Recommended';
      case 'distance':
        return 'Distance';
      case 'rating':
        return 'Top Rated';
      case 'price_low':
        return 'Lowest Price';
      case 'price_high':
        return 'Highest Price';
      default:
        return 'Recommended';
    }
  };

  const handlePress = () => {
    setIsVisible(true);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSelectSort = (sort: SortOption) => {
    onSortChange(sort);
    setIsVisible(false);
  };

  const actions: ActionItem[] = [
    {
      label: 'Recommended',
      icon: Star,
      onPress: () => handleSelectSort('relevance'),
    },
    {
      label: 'Nearest first',
      icon: MapPin,
      onPress: () => handleSelectSort('distance'),
    },
    {
      label: 'Highest rated',
      icon: Star,
      onPress: () => handleSelectSort('rating'),
    },
    {
      label: 'Lowest price',
      icon: ArrowDownAZ,
      onPress: () => handleSelectSort('price_low'),
    },
  ];

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={[styles.container, style]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Sort settings. Current: ${getSortLabel(currentSort)}. Tap to edit.`}
      >
        <Text style={styles.prefixText}>Sort: </Text>
        <Text style={styles.labelText}>{getSortLabel(currentSort)}</Text>
        <ChevronDown
          size={12}
          color={colors.primary}
          style={styles.icon}
        />
      </Pressable>

      <ActionSheet
        isVisible={isVisible}
        onClose={handleClose}
        title="Sort workers by"
        actions={actions}
      />
    </>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
  },
  prefixText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  labelText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  icon: {
    marginLeft: 2,
  },
});
