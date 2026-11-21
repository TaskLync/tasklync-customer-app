import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { ChevronLeftIcon, FilterIcon } from '../ui/Icon/icons';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../ui/Button/IconButton';
import { SearchBar, SEARCH_BAR, type SearchBarRef } from '../search/SearchBar';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface SearchHeaderProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  showFilterButton?: boolean;
  activeFilterCount?: number;
  onFilterPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  scrollY?: SharedValue<number>;
  /** Imperative focus (e.g. arriving from the Home search bar). */
  searchRef?: React.Ref<SearchBarRef>;
}

const FIELD_H = SEARCH_BAR.height;

/**
 * Explore search header: the shared SearchBar (same as Home) and a matching soft-square filter button.
 * Focus is handled by SearchBar (faint green ring); a hairline appears under the header
 * only once content scrolls beneath it.
 */
export const SearchHeader: React.FC<SearchHeaderProps> = ({
  value,
  onChangeText,
  onClear,
  onSubmit,
  placeholder,
  showFilterButton = true,
  activeFilterCount = 0,
  onFilterPress,
  showBackButton = false,
  onBackPress,
  scrollY,
  searchRef,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? withTiming(scrollY.value > 8 ? 1 : 0, { duration: 160 }) : 0,
  }));

  const filterScale = useSharedValue(1);
  const filterStyle = useAnimatedStyle(() => ({ transform: [{ scale: filterScale.value }] }));

  return (
    <View style={[styles.container, { paddingTop: (insets.top || 16) + 8 }]}>
      <View style={styles.row}>
        {showBackButton && (
          <View style={styles.back}>
            <IconButton icon={ChevronLeftIcon} onPress={() => onBackPress?.()} size={40} bg="transparent" accessibilityLabel="Back" />
          </View>
        )}

        <View style={styles.fieldWrap}>
          <SearchBar
            ref={searchRef}
            value={value}
            onChangeText={onChangeText}
            onClear={onClear}
            {...(onSubmit ? { onSubmit } : {})}
            {...(placeholder ? { placeholder } : {})}
          />
        </View>

        {showFilterButton && (
          <Animated.View style={[styles.filterWrap, filterStyle]}>
            <Pressable
              onPress={onFilterPress}
              onPressIn={() => (filterScale.value = withSpring(0.92, { damping: 18, stiffness: 420 }))}
              onPressOut={() => (filterScale.value = withSpring(1, { damping: 14, stiffness: 320 }))}
              style={({ pressed }) => [styles.filterButton, pressed && styles.filterButtonPressed]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={activeFilterCount > 0 ? `Filters, ${activeFilterCount} applied` : 'Filters'}
            >
              <FilterIcon size={SEARCH_BAR.iconSize - 1} strokeWidth={2} color={colors.textPrimary} />
              {activeFilterCount > 0 && (
                <View style={styles.badge} pointerEvents="none">
                  <Text style={styles.badgeText} maxFontSizeMultiplier={1.1}>
                    {activeFilterCount > 9 ? '9+' : activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        )}
      </View>
      <Animated.View style={[styles.hairline, hairlineStyle]} pointerEvents="none" />
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgCard,
      paddingHorizontal: 20,
      paddingBottom: 12,
      zIndex: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    back: {
      marginLeft: -8,
    },
    fieldWrap: {
      flex: 1,
    },
    filterWrap: {},
    filterButton: {
      width: FIELD_H,
      height: FIELD_H,
      borderRadius: SEARCH_BAR.radius,
      borderCurve: 'continuous',
      backgroundColor: colors.searchFieldBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButtonPressed: {
      backgroundColor: colors.buttonSecondaryPressed,
    },
    badge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: colors.buttonPrimary,
      borderWidth: 2,
      borderColor: colors.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: typography.fontFamily.inter.bold,
      fontSize: 9.5,
      color: colors.buttonPrimaryText,
      includeFontPadding: false,
    },
    hairline: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
  });
