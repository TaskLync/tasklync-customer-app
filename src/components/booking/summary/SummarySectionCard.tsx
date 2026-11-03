import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily } from '../../../design';

export interface SummarySectionCardProps {
  /** Kept for API compatibility; sections are text-led and no longer render an icon. */
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  rightAction?: ReactNode;
}

export const SummarySectionCard: React.FC<SummarySectionCardProps> = ({
  title,
  children,
  rightAction,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {rightAction ? <View>{rightAction}</View> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    width: '100%',
  },
});