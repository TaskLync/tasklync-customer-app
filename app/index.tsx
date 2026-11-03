import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { colors } from '../src/design/colors';

export default function IndexScreen() {
  const router = useRouter();
  const authState = useAuthStore((s) => s.authState);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  useEffect(() => {
    // Wait if authentication is still initializing from persistent MMKV storage
    if (authState === 'INITIALIZING' || authState === 'idle' || authState === 'loading') {
      return;
    }

    const hasStoredCredentials = Boolean(accessToken && refreshToken);
    const isSessionActive =
      authState === 'AUTHENTICATED' ||
      authState === 'authenticated' ||
      authState === 'REFRESHING_TOKEN' ||
      authState === 'TEMPORARILY_UNAVAILABLE';

    if (hasStoredCredentials || isSessionActive) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [authState, accessToken, refreshToken, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgApp,
  },
});
