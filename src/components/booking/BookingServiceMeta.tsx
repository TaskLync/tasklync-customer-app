import { colors, palette } from '../../design';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatPKTDateTime } from '../../utils/timezone';

interface BookingServiceMetaProps {
  scheduledAt: string;
}

export function BookingServiceMeta({ scheduledAt }: BookingServiceMetaProps) {
  const formattedDateTime = formatPKTDateTime(scheduledAt);

  return (
    <View style={styles.container}>
      <Text style={styles.dateTime} numberOfLines={1} ellipsizeMode="tail">
        {formattedDateTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
