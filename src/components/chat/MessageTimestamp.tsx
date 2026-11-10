import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface MessageTimestampProps {
  label: string;
}

export const MessageTimestamp = React.memo(function MessageTimestamp({
  label,
}: MessageTimestampProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
});

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
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
