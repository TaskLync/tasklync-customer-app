import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatPKTDateTime } from '../../utils/timezone';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingServiceMetaProps {
  scheduledAt: string;
}

export function BookingServiceMeta({ scheduledAt }: BookingServiceMetaProps) {
  const styles = useThemedStyles(createStyles);
  const formattedDateTime = formatPKTDateTime(scheduledAt);

  return (
    <View style={styles.container}>
      <Text style={styles.dateTime} numberOfLines={1} ellipsizeMode="tail">
        {formattedDateTime}
      </Text>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 0,
  },
  icon: {
    marginRight: 6,
    flexShrink: 0,
  },
  dateTime: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12.5,
    color: colors.textSecondary,
    flexShrink: 1,
  },
});
