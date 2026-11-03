import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, palette, fontFamily } from '../../../design';

export interface CalendarHeaderProps {
  monthLabel: string; // e.g. "August 2026"
  canGoPrev: boolean;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  /** Alias for onPrevMonth */
  onPrev?: () => void;
  /** Alias for onNextMonth */
  onNext?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  monthLabel,
  canGoPrev,
  onPrevMonth,
  onNextMonth,
  onPrev,
  onNext,
}) => {
  const handlePrev = onPrevMonth ?? onPrev ?? (() => {});
  const handleNext = onNextMonth ?? onNext ?? (() => {});

  return (
    <View style={styles.container}>
      <Text style={styles.monthText}>{monthLabel}</Text>

      <View style={styles.navContainer}>
        {/* Previous Month Arrow */}
        <Pressable
          onPress={handlePrev}
          disabled={!canGoPrev}
          style={[styles.arrowButton, !canGoPrev && styles.arrowDisabled]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Previous Month"
          accessibilityState={{ disabled: !canGoPrev }}
        >
          <ChevronLeft
            size={20}
            color={canGoPrev ? colors.textPrimary : palette.gray300}
            strokeWidth={2.2}
          />
        </Pressable>

        {/* Next Month Arrow */}
        <Pressable
          onPress={handleNext}
          style={styles.arrowButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Next Month"
        >
          <ChevronRight size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: palette.white,
  },
  monthText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    backgroundColor: palette.gray50,
    opacity: 0.5,
  },
});
