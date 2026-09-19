import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import { useLocationStore } from '../store/location.store';
import { usePushRegistration } from './usePushRegistration';
import { socketService } from '../services/socket/socket.service';
import { createMMKV } from 'react-native-mmkv';

const userStorage = createMMKV({ id: 'tasklync_user_profile_storage' });
const bookingsStorage = createMMKV({ id: 'tasklync_bookings_storage' });
const settingsStorage = createMMKV({ id: 'tasklync_settings_storage' });

/**
 * useLogout Hook (Day 37 Session Teardown Cascade)
 *
 * Implements strict ordered multi-system teardown:
 * 1. Disconnect any active WebSockets & unregister push token
 * 2. Clear TanStack Query Cache completely (prevents data leak on shared device)
 * 3. Reset Zustand Stores (auth, cart, location)
 * 4. Clear MMKV / Secure persisted cache
 * 5. Navigate to (auth)/welcome with router.replace() (disallowing back navigation)
 * 6. Resilient offline handling (never blocks logout on network fail)
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { unregister } = usePushRegistration();
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {

      // 1. Disconnect WebSockets and unregister push notifications while session token is valid
      try {
        socketService.disconnect();
      } catch (_e) {}

      try {
        await unregister();
      } catch (_e) {}

      // 2. Clear TanStack Query Cache completely
      queryClient.clear();

      // 3. Reset Zustand Stores
      try {
        useCartStore.getState().clearCart();
      } catch (_e) {}

      try {
        useLocationStore.getState().setSelectedAddress(null);
        useLocationStore.getState().setLastPickedCoords(null);
      } catch (_e) {}

      // 4. Clear local cache storages
      try {
        userStorage.clearAll();
        bookingsStorage.clearAll();
        settingsStorage.clearAll();
      } catch (_e) {}

      // 5. Clear Auth Store & Tokens
      useAuthStore.getState().logout();

      // 6. Navigate to Welcome root (replace, not push)
      router.replace('/(auth)/welcome' as any);
    } catch (_err) {
      // Force local logout on unexpected error
      useAuthStore.getState().logout();
      router.replace('/(auth)/welcome' as any);
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, queryClient, router, unregister]);

  return {
    logout,
    isLoggingOut,
  };
}
