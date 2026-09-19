import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../store/auth.store';
import { useCartStore } from '../store/cart.store';
import { useLocationStore } from '../store/location.store';
import { usePushRegistration } from './usePushRegistration';
import { socketService } from '../services/socket/socket.service';
import { createMMKV } from 'react-native-mmkv';
import { DeleteAccountReason } from '../types/moderation.types';

const userStorage = createMMKV({ id: 'tasklync_user_profile_storage' });
const bookingsStorage = createMMKV({ id: 'tasklync_bookings_storage' });
const settingsStorage = createMMKV({ id: 'tasklync_settings_storage' });
const moderationStorage = createMMKV({ id: 'tasklync_moderation_storage' });

export function useDeleteAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { unregister } = usePushRegistration();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const deleteAccount = useCallback(
    async (reason?: DeleteAccountReason, feedback?: string): Promise<void> => {
      setIsDeleting(true);

      try {
        // 1. Server-side deletion call
        try {
          await apiClient.delete('/users/me', {
            data: {
              reason,
              feedback,
              confirmation: 'DELETE',
            },
          });
        } catch (err: any) {
          // If network is completely offline, allow fallback delete
          if (err?.response?.status && err.response.status >= 500) {
            throw err;
          }
        }

        // Single success haptic (Peak-End Rule)

        // 2. Full Multi-system Session Teardown Cascade
        // Step 2a: Disconnect WebSockets and unregister push notifications
        try {
          socketService.disconnect();
        } catch (_e) {}

        try {
          await unregister();
        } catch (_e) {}

        // Step 2b: In-memory TanStack Query Cache clearance
        queryClient.clear();

        // Step 2c: Reset Zustand Stores
        try {
          useCartStore.getState().clearCart();
        } catch (_e) {}

        try {
          useLocationStore.getState().setSelectedAddress(null);
          useLocationStore.getState().setLastPickedCoords(null);
        } catch (_e) {}

        // Step 2d: Clear local cache storages
        try {
          userStorage.clearAll();
          bookingsStorage.clearAll();
          settingsStorage.clearAll();
          moderationStorage.clearAll();
        } catch (_e) {}

        // Step 2e: Clear Auth Store & Tokens
        useAuthStore.getState().logout();

        // Step 2f: 2-second calm goodbye pause before routing to welcome
        setTimeout(() => {
          setIsDeleting(false);
          router.replace('/(auth)/welcome' as any);
        }, 2000);
      } catch (error) {
        setIsDeleting(false);
        throw error;
      }
    },
    [queryClient, router, unregister]
  );

  return {
    deleteAccount,
    isDeleting,
  };
}
