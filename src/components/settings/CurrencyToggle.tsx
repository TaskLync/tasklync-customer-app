import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { CurrencyCode } from '../../types/settings.types';
import { colors, palette, fontFamily, radius } from '../../design';

export interface CurrencyToggleProps {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
}

const TOGGLE_WIDTH = 138;
const TOGGLE_HEIGHT = 34;
const PADDING = 2;
const PILL_WIDTH = (TOGGLE_WIDTH - PADDING * 2) / 2; // 67px

export const CurrencyToggle: React.FC<CurrencyToggleProps> = ({ value, onChange }) => {
  const isPkr = value === 'PKR';
  const translateX = useSharedValue(isPkr ? 0 : PILL_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(isPkr ? 0 : PILL_WIDTH, {
      damping: 24,
      stiffness: 300,
      mass: 0.8,
    });
  }, [isPkr, translateX]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleSelect = (curr: CurrencyCode) => {
    if (curr !== value) {
      onChange(curr);
    }
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel="Select App Currency"
    >
      {/* Animated Sliding Brand-Green Pill */}
      <Animated.View style={[styles.activePill, animatedPillStyle]} />

      {/* PKR Option */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.optionBtn}
        onPress={() => handleSelect('PKR')}
        accessibilityRole="radio"
        accessibilityState={{ selected: isPkr }}
        accessibilityLabel="Pakistani Rupee"
      >
        <Text
          style={[styles.optionText, isPkr && styles.optionTextActive]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          PKR (Rs)
        </Text>
      </TouchableOpacity>

      {/* USD Option */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.optionBtn}
        onPress={() => handleSelect('USD')}
        accessibilityRole="radio"
        accessibilityState={{ selected: !isPkr }}
        accessibilityLabel="US Dollar"
      >
        <Text
          style={[styles.optionText, !isPkr && styles.optionTextActive]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          USD ($)
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray100,
    borderRadius: radius.pill,
    padding: PADDING,
    position: 'relative',
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  activePill: {
    position: 'absolute',
    top: PADDING,
    left: PADDING,
    bottom: PADDING,
    width: PILL_WIDTH,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.pill,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  optionBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  optionText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  optionTextActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: palette.white,
  },
});
