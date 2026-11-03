import { colors, palette } from '../../design';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NotificationBell } from '../home/NotificationBell';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BookingsHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>My Bookings</Text>
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: colors.bgCard,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#111827',
  },
});
