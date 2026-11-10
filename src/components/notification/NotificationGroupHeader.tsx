import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface NotificationGroupHeaderProps {
  title: string;
  count?: number;
}

/**
 * NotificationGroupHeader Component
 *
 * Minimalist section heading for FlashList notification groups:
 * - Subtle typography (Jakarta-SemiBold, 12px)
 * - Seamless canvas background without borders or count badges
 * - Comfortable 4pt/8pt vertical spacing
 */
export const NotificationGroupHeader: React.FC<NotificationGroupHeaderProps> = React.memo(
  function NotificationGroupHeader({ title }) {
    const styles = useThemedStyles(createStyles);
    return (
      <View style={styles.container} accessibilityRole="header">
        <Text style={styles.title}>{title}</Text>
      </View>
    );
  }
);

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: colors.bgApp,
  },
  title: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
});
