import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { ChevronLeft, SlidersHorizontal } from 'lucide-react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchInput } from '../ui/Input/SearchInput';
import { IconButton } from '../ui/Button/IconButton';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';
import { timingConfig } from '../../design/animations';

interface SearchHeaderProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  showFilterButton?: boolean;
  activeFilterCount?: number;
  onFilterPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  scrollY?: SharedValue<number>;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder,
  showFilterButton = true,
  activeFilterCount = 0,
  onFilterPress,
  showBackButton = false,
  onBackPress,
  scrollY,
}) => {
  const insets = useSafeAreaInsets();
  
  // Shadow appears after scrollY > 10
  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      shadowOpacity: withTiming(scrollY.value > 10 ? 0.08 : 0, { duration: timingConfig.fast }),
      elevation: withTiming(scrollY.value > 10 ? 4 : 0, { duration: timingConfig.fast }),
    };
  });

  return (
    <AnimatedView
      style={[
        styles.container,
        { paddingTop: insets.top || 16 },
        headerAnimatedStyle,
      ]}
    >
      <View style={styles.innerRow}>
        {showBackButton && (
          <View style={styles.backButtonContainer}>
            <IconButton
              icon={ChevronLeft}
              onPress={() => onBackPress?.()}
              size={36}
              bg="transparent"
              accessibilityLabel="Back"
            />
          </View>
        )}

        <SearchInput
          value={value}
          onChangeText={onChangeText}
          onClear={onClear}
          {...(placeholder !== undefined && { placeholder })}
          autoFocus={false} // Don't auto-focus in header generally unless specified
        />

        {showFilterButton && (
          <View style={styles.filterContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.filterButton,
                pressed && styles.filterButtonPressed,
              ]}
              onPress={onFilterPress}
              hitSlop={4}
            >
              <SlidersHorizontal size={20} color={colors.textPrimary} />
              
              {activeFilterCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {activeFilterCount > 9 ? '9+' : activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 10,
    // Base shadow config, opacity driven by animation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonContainer: {
    marginRight: 8,
  },
  filterContainer: {
    marginLeft: 12,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonPressed: {
    backgroundColor: colors.border,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgCard, // To cut out background
  },
  badgeText: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: 9,
    color: '#FFFFFF',
  },
});
