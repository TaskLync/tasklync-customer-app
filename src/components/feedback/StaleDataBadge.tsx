import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Clock } from 'lucide-react-native';
import { fontFamily } from '../../design/typography';
import { NETWORK_CONFIG } from '../../config/networkConfig';
import { useStaleDataLabel } from '../../hooks/useStaleDataLabel';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface StaleDataBadgeProps {
  cachedAt?: number | Date | null;
  style?: StyleProp<ViewStyle>;
  showIcon?: boolean;
}

const BADGE_HEIGHT = NETWORK_CONFIG.STALE_BADGE_HEIGHT; // 20px

/**
 * StaleDataBadge Component (Day 39)
 * 
 * Implements Zero Anxiety & Minimal Distraction UX:
 * - Unobtrusive inline chip informing user of cached content age
 * - Direct text swap without motion (motion on ticking timestamps is visually noisy)
 * - Inter Regular 11px for numeric data compliance
 * - Full unabbreviated accessibility label for assistive technology
 */
export const StaleDataBadge: React.FC<StaleDataBadgeProps> = React.memo(
  ({ cachedAt, style, showIcon = true }) => {
    const { palette } = useAppTheme();
    const styles = useThemedStyles(createStyles);
    const { label, fullAccessibilityLabel, isStale } = useStaleDataLabel(cachedAt);

    if (!cachedAt || !label) {
      return null;
    }

    return (
      <View
        style={[styles.badge, style]}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={fullAccessibilityLabel}
      >
        {showIcon && (
          <Clock
            size={10}
            color={palette.gray400}
            strokeWidth={2}
            style={styles.icon}
          />
        )}
        <Text style={styles.text} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }
);

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  badge: {
    height: BADGE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray100,
    borderColor: palette.gray200,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 11,
    color: palette.gray400, // palette.textMuted
    lineHeight: 14,
  },
});
