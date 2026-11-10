import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { CalendarDayItem } from '../../../hooks/useCalendarMonth';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface CalendarDayCellProps {
  dayItem: CalendarDayItem;
  isSelected: boolean;
  onSelect: (dateStr: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  dayItem,
  isSelected,
  onSelect,
}) => {
  const styles = useThemedStyles(createStyles);
  const { dateStr, dayNumber, isCurrentMonth, isToday, isPast, isAvailable } = dayItem;

  // Disabled if outside current month, in the past, or has no real-time availability
  const isDisabled = !isCurrentMonth || isPast || !isAvailable;

  // Minimal 100ms timing transition
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withTiming(1.0, { duration: 100 });
    } else {
      scale.value = withTiming(1.0, { duration: 100 });
    }
  }, [isSelected, scale]);

  const handlePress = () => {
    if (isDisabled) return;
    onSelect(dateStr);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getCellStateStyle = () => {
    if (isDisabled) return styles.cellDisabled;
    if (isSelected) return styles.cellSelected;
    if (isToday) return styles.cellToday;
    return styles.cellIdle;
  };

  const getTextStyle = () => {
    if (isDisabled) return styles.textDisabled;
    if (isSelected) return styles.textSelected;
    if (isToday) return styles.textToday;
    return styles.textIdle;
  };

  return (
    <View style={styles.outerContainer}>
      <AnimatedPressable
        onPress={handlePress}
        disabled={isDisabled}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={[styles.cellBase, getCellStateStyle(), animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${dayNumber} ${isSelected ? 'selected' : ''}`}
        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      >
        <Text style={[styles.dayText, getTextStyle()]}>{dayNumber}</Text>

        {isToday && !isSelected && <View style={styles.todayUnderline} />}
      </AnimatedPressable>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellBase: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellIdle: {
    backgroundColor: 'transparent',
  },
  cellToday: {
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  cellSelected: {
    backgroundColor: colors.primary,
  },
  cellDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.35,
  },
  dayText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  textIdle: {
    color: colors.textPrimary,
  },
  textToday: {
    color: colors.primaryDark,
    fontFamily: fontFamily.inter.bold,
  },
  textSelected: {
    color: palette.pureWhite,
    fontFamily: fontFamily.inter.bold,
  },
  textDisabled: {
    color: palette.gray300,
  },
  todayUnderline: {
    position: 'absolute',
    bottom: 4,
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
});
