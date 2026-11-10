import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface SystemMessageProps {
  content: string;
}

export const SystemMessage = React.memo(function SystemMessage({
  content,
}: SystemMessageProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{content}</Text>
      </View>
    </View>
  );
});

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    paddingHorizontal: 24,
  },
  pill: {
    backgroundColor: colors.bgSubtle,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
