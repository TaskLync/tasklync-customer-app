import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Home } from 'lucide-react-native';
import { ErrorState } from './ErrorState';
import { fontFamily } from '../../design/typography';
import { palette, colors } from '../../design/colors';
import { radius } from '../../design/radius';
import { useAuthStore } from '../../store/auth.store';

export interface RouteErrorBoundaryProps {
  error: Error;
  retry: () => void;
}

/**
 * Expo Router-compatible Route Error Boundary Component
 *
 * Export this component as `ErrorBoundary` from any route file or layout:
 * `export { RouteErrorBoundary as ErrorBoundary } from '../../src/components/feedback/RouteErrorBoundary';`
 */
export function RouteErrorBoundary({ error, retry }: RouteErrorBoundaryProps) {
  const router = useRouter();
  const [showStack, setShowStack] = useState(false);

  const handleGoHome = () => {
    try {
      const isAuth = useAuthStore.getState().isAuthenticated;
      if (isAuth) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    } catch {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <ErrorState
        type="error"
        title="Something went wrong"
        subtitle={
          __DEV__
            ? error.message || 'An unexpected error occurred in this screen.'
            : 'An unexpected error occurred. You can retry loading this screen or go back to home.'
        }
        onRetry={retry}
        retryButtonText="Try Again"
      />

      {/* Navigation action buttons */}
      <View style={styles.actionsContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.homeButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleGoHome}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Home size={16} color={colors.textPrimary} />
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </Pressable>
      </View>

      {/* Developer stack trace in __DEV__ */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Pressable
            onPress={() => setShowStack((s) => !s)}
            style={styles.debugToggle}
            accessibilityRole="button"
          >
            <Text style={styles.debugToggleText}>
              {showStack ? 'Hide Error Details ▲' : 'Show Error Details ▼'}
            </Text>
          </Pressable>

          {showStack && (
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              <Text style={styles.debugErrorName}>
                {error.name}: {error.message}
              </Text>
              {error.stack && (
                <Text style={styles.debugStackTrace}>{error.stack}</Text>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.zenWhite,
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 24,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray300,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  homeButtonText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  debugContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  debugToggle: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: palette.gray100,
    marginBottom: 8,
  },
  debugToggleText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: palette.gray700,
  },
  debugScroll: {
    maxHeight: 180,
    backgroundColor: palette.gray900,
    borderRadius: radius.md,
    padding: 12,
  },
  debugErrorName: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 12,
    color: '#F87171',
    marginBottom: 6,
  },
  debugStackTrace: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: palette.gray300,
    lineHeight: 14,
  },
});
