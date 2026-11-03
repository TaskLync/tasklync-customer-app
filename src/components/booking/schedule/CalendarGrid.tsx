import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CalendarDayItem } from '../../../hooks/useCalendarMonth';
import { CalendarDayCell } from './CalendarDayCell';
import { palette } from '../../../design';

export interface CalendarGridProps {
  daysArray?: CalendarDayItem[];
  days?: CalendarDayItem[];
  selectedDate: string | null;
  slideDirection: 'next' | 'prev';
  visibleMonth?: number;
  visibleYear?: number;
  onSelectDate: (dateStr: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  daysArray: propDaysArray,
  days,
  selectedDate,
  slideDirection,
  visibleMonth = 0,
  visibleYear = 0,
  onSelectDate,
}) => {
  const daysArray = propDaysArray ?? days ?? [];
  const translateX = useSharedValue(0);

  // Fast minimal slide transition on month change (120ms)
  useEffect(() => {
    const initialOffset = slideDirection === 'next' ? 24 : -24;
    translateX.value = initialOffset;
    translateX.value = withTiming(0, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  }, [visibleMonth, visibleYear, slideDirection, translateX]);

  const gridAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rows = React.useMemo(() => {
    const chunked: CalendarDayItem[][] = [];
    const items = daysArray || [];
    for (let i = 0; i < items.length; i += 7) {
      chunked.push(items.slice(i, i + 7));
    }
    return chunked;
  }, [daysArray]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.gridContainer, gridAnimatedStyle]}>
        {rows.map((rowDays, rowIndex) => (
          <View key={`grid-row-${rowIndex}`} style={styles.row}>
            {rowDays.map((dayItem) => (
              <CalendarDayCell
                key={dayItem.dateStr}
                dayItem={dayItem}
                isSelected={selectedDate === dayItem.dateStr}
                onSelect={onSelectDate}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  gridContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
});
