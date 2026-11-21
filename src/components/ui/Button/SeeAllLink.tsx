import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ArrowRightIcon } from '../Icon/icons';

import { fontFamily } from '../../../design/typography';
import { useAppTheme } from '../../../theme/useAppTheme';

export interface SeeAllLinkProps {
  onPress?: (() => void) | undefined;
  /** Visible text. A trailing "→" is ignored: the arrow is always the icon, so text and arrow share one colour. */
  label?: string;
  accessibilityLabel?: string;
}

/**
 * The single "See all →" section action. Text and arrow share one NEUTRAL colour:
 * Light: slate grey `textSecondary` #475569 on white (7.6:1).
 * Dark:  premium off-white `textPrimary` #F0F2F5 (~16:1), never pure #FFFFFF, to avoid OLED glare.
 * Deliberately not brand green: a secondary link should recede so green stays for primary actions.
 */
export const SeeAllLink: React.FC<SeeAllLinkProps> = ({ onPress, label = 'See all', accessibilityLabel }) => {
  const { colors, isDark } = useAppTheme();
  const tint = isDark ? colors.textPrimary : colors.textSecondary;
  const text = label.replace(/\s*→\s*$/, '');
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={[styles.text, { color: tint }]} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
      <ArrowRightIcon size={14} color={tint} strokeWidth={2.2} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24 },
  text: { fontFamily: fontFamily.jakarta.semiBold, fontSize: 13.5, lineHeight: 18, includeFontPadding: false },
  pressed: { opacity: 0.6 },
});
