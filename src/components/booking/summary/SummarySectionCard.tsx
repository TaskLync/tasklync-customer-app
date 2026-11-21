import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SummarySectionCardProps {
  /** Kept for API compatibility; sections are text-led and no longer render an icon. */
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  rightAction?: ReactNode;
  /** Kept for API compatibility; sections no longer draw dividers. */
  last?: boolean;
}

/**
 * One review section: a quiet label sitting close to its content. No card, no icon, no divider:
 * the screen separates sections with whitespace (label→content 8, section→section 32).
 */
export const SummarySectionCard: React.FC<SummarySectionCardProps> = ({
  title,
  children,
  rightAction,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {rightAction ? <View>{rightAction}</View> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  body: {
    width: '100%',
  },
});
