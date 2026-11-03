import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/config/queryClient';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { fontAssets } from '../src/config/fonts';
import { AppProviders } from '../src/providers/AppProviders';
import { FloatingCartBar } from '../src/components/cart/FloatingCartBar';
import { colors } from '../src/design/colors';
import { RouteErrorBoundary } from '../src/components/feedback';

export { RouteErrorBoundary as ErrorBoundary };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppProviders>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }}>
              <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="service/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="category/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="category/index" options={{ animation: 'none' }} />
              <Stack.Screen name="cart/index" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen
                name="worker/[id]"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: colors.bgApp },
                  fullScreenGestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="company/index"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: colors.bgApp },
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="company/[id]"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: colors.bgApp },
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen name="booking/schedule" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="booking/address" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="booking/summary" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="booking/payment" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="booking/[id]/chat" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="booking/success" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
              <Stack.Screen name="booking/[id]/track" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="booking/[id]/review" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
              <Stack.Screen name="booking/[id]/invoice" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="booking/[id]/dispute" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="notifications/index" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="notifications/preferences" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="profile/addresses" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="profile/addresses/add" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="profile/payment-methods" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="profile/booking-history" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="profile/blocked-workers" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="profile/settings" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="custom-request/new" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="custom-request/[id]/index" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="custom-request/[id]/quote" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="custom-request/[id]/checkout" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="chat/request/[requestId]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
              <Stack.Screen name="search/filters" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
            <FloatingCartBar />
          </AppProviders>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
