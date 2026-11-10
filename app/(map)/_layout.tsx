import { Stack } from 'expo-router';
import { useAppTheme } from '../../src/theme/useAppTheme';

export default function MapLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }}>
      <Stack.Screen name="live-map" options={{ animation: 'slide_from_bottom', gestureEnabled: true }} />
    </Stack>
  );
}
