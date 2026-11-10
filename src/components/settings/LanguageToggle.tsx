import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LanguageCode } from '../../types/settings.types';
import { fontFamily, radius } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface LanguageToggleProps {
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
}

const TOGGLE_WIDTH = 138;
const TOGGLE_HEIGHT = 34;
const PADDING = 2;
const PILL_WIDTH = (TOGGLE_WIDTH - PADDING * 2) / 2; // 67px

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ value, onChange }) => {
  const styles = useThemedStyles(createStyles);
  const isEnglish = value === 'en';
  const translateX = useSharedValue(isEnglish ? 0 : PILL_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(isEnglish ? 0 : PILL_WIDTH, {
      damping: 24,
      stiffness: 300,
      mass: 0.8,
    });
  }, [isEnglish, translateX]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleSelect = (lang: LanguageCode) => {
    if (lang !== value) {
      onChange(lang);
    }
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel="Select App Language"
    >
      {/* Animated Sliding Brand-Green Pill */}
      <Animated.View style={[styles.activePill, animatedPillStyle]} />

      {/* English Option */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.optionBtn}
        onPress={() => handleSelect('en')}
        accessibilityRole="radio"
        accessibilityState={{ selected: isEnglish }}
        accessibilityLabel="English"
      >
        <Text
          style={[styles.optionText, isEnglish && styles.optionTextActive]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          English
        </Text>
      </TouchableOpacity>

      {/* Urdu Option */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.optionBtn}
        onPress={() => handleSelect('ur')}
        accessibilityRole="radio"
        accessibilityState={{ selected: !isEnglish }}
        accessibilityLabel="Urdu"
      >
        <Text
          style={[styles.optionText, !isEnglish && styles.optionTextActive]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          اردو
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
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
    shadowColor: colors.black,
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
    fontSize: 12,
    color: colors.textSecondary,
  },
  optionTextActive: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: palette.pureWhite,
  },
});
