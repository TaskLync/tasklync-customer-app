import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { SlotInfo } from '../../../hooks/useWorkerSlots';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface TimeSlotChipProps {
  slot: SlotInfo;
  isSelected: boolean;
  onSelect: (timeStr: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const TimeSlotChip: React.FC<TimeSlotChipProps> = ({
  slot,
  isSelected,
  onSelect,
}) => {
  const styles = useThemedStyles(createStyles);
  const { timeStr, available, isPeak } = slot;

  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.03, { damping: 14, stiffness: 220 });
    } else {
      scale.value = withTiming(1.0, { duration: 150 });
    }
  }, [isSelected, scale]);

  const handlePress = () => {
    if (!available) return;
    onSelect(timeStr);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.chipWrapper}>
      <AnimatedPressable
        onPress={handlePress}
        disabled={!available}
        style={[
          styles.chip,
          !available && styles.chipUnavailable,
          available && !isSelected && styles.chipAvailable,
          isSelected && styles.chipSelected,
          animatedStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${timeStr} ${isPeak ? 'Peak demand' : ''} ${
          isSelected ? 'selected' : ''
        }`}
        accessibilityState={{ selected: isSelected, disabled: !available }}
      >
        <Text
          style={[
            styles.timeText,
            !available && styles.textUnavailable,
            available && !isSelected && styles.textAvailable,
            isSelected && styles.textSelected,
          ]}
        >
          {timeStr}
        </Text>

        {isPeak && available && !isSelected && (
          <View style={styles.peakDot} />
        )}
      </AnimatedPressable>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  chipWrapper: {
    width: '31.5%',
    marginBottom: 10,
  },
  chip: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  chipAvailable: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  chipUnavailable: {
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: palette.gray200,
    opacity: 0.5,
  },
  timeText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 13,
    lineHeight: 16,
  },
  textAvailable: {
    color: colors.textPrimary,
  },
  textSelected: {
    color: palette.pureWhite,
    fontFamily: fontFamily.inter.bold,
  },
  textUnavailable: {
    color: palette.gray400,
    textDecorationLine: 'line-through',
  },
  peakDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: palette.warning,
    marginLeft: 4,
  },
});
