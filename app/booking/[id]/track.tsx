import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';

export default function BookingTrackScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      router.replace({
        pathname: `/booking/${id}`,
      } as any);
    } else {
      router.replace('/(tabs)/bookings');
    }
  }, [id, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primaryDark} />
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
