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
    marginTop: 14,
    marginBottom: 6,
  },
  pill: {
    backgroundColor: colors.bgHover,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11.5,
    color: colors.textSecondary,
  },
});
