import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamily } from '../../design/typography';
import { colors } from '../../design/colors';

interface TabBadgeProps {
  count: number;
}

/**
 * TabBadge
 *
 * Minimalist, compact, high-legibility notification badge for bottom navigation.
 * - Pure static render without animation overhead for instant response
 * - Crisp cutout border matching tab bar background (#F5F6F7)
 * - Scaled circular geometry for single-digits, neat pill shape for multi-digits
 * - Sensible count ceiling (99+)
 */
export const TabBadge: React.FC<TabBadgeProps> = React.memo(({ count }) => {
  if (!count || count <= 0) return null;

  const displayCount = count > 99 ? '99+' : `${count}`;
  const isMultiDigit = count > 9;

  return (
    <View
      style={[
        styles.badge,
        isMultiDigit ? styles.badgeMultiDigit : styles.badgeSingleDigit,
      ]}
      pointerEvents="none"
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    >
      <Text style={styles.badgeText} numberOfLines={1}>
        {displayCount}
      </Text>
    </View>
  );
});

TabBadge.displayName = 'TabBadge';

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    height: 16,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeSingleDigit: {
    width: 16,
    borderRadius: 8,
    paddingHorizontal: 0,
  },
  badgeMultiDigit: {
    minWidth: 16,
    borderRadius: 8,
    paddingHorizontal: 3.5,
  },
  badgeText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 11,
  },
});
