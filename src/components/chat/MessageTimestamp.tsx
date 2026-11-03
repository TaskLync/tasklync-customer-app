import { colors, palette } from '../../design';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageTimestampProps {
  label: string;
}

export const MessageTimestamp = React.memo(function MessageTimestamp({
  label,
}: MessageTimestampProps) {
  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  pill: {
    backgroundColor: colors.bgHover,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
});
