import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { typography } from '../../design/typography';
import { radius } from '../../design/radius';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface SearchChipProps {
  label: string;
  onPress: () => void;
  /** Selectable chips (categories) cross-fade into the green selected state. */
  selected?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}

/**
 * Compact Explore chip: 36pt tall, soft neutral fill, charcoal label, no border.
 * Selected: light green fill + green label (functional state, per THEMING.md).
 */
export const SearchChip: React.FC<SearchChipProps> = React.memo(({ label, onPress, selected = false, icon, accessibilityLabel }) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: 160 });
  }, [selected, on]);

  const offBg = colors.searchFieldBg;
  const onBg = colors.primaryTint;
  const fill = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], [offBg, onBg]) }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Animated.View style={[styles.chip, fill]}>
        {icon}
        <Text
          style={[styles.label, selected && { color: palette.green700, fontFamily: typography.fontFamily.jakarta.semiBold }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

SearchChip.displayName = 'SearchChip';

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 14,
      color: colors.textPrimary,
    },
  });
