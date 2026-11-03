import { colors, palette } from '../../design';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SystemMessageProps {
  content: string;
}

export const SystemMessage = React.memo(function SystemMessage({
  content,
}: SystemMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{content}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    paddingHorizontal: 24,
  },
  pill: {
    backgroundColor: colors.bgSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
