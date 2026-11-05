import React, { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore, useLocationStore, useUIStore } from '../store';
import { isSignedOutState } from '../store/auth.store';
import { queryClient } from '../config/queryClient';
import { ensureFreshAccessToken, refreshAccessToken } from '../services/api/client';
import { sessionEndMessage } from '../services/auth/sessionCore';
import { useAppState } from '../hooks/useAppState';

/** Session came back from a network failure, or the app resumed with an old access token. */
function recoverSession(trigger: string) {
  const s = useAuthStore.getState();
  if (!s.refreshToken) return;
  if (s.authState === 'TEMPORARILY_UNAVAILABLE') {
    refreshAccessToken(trigger).catch(() => undefined);
  } else {
    void ensureFreshAccessToken();
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const authState = useAuthStore((state) => state.authState);
  const sessionEndReason = useAuthStore((state) => state.sessionEndReason);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateLocation = useLocationStore((state) => state.hydrate);
  const handledExpiry = useRef(false);

  useEffect(() => {
    void hydrateAuth(); // idempotent: already started when the store module loaded
    hydrateLocation();
  }, [hydrateAuth, hydrateLocation]);

  // The server confirmed the session is over (refresh endpoint 401): wipe this account's
  // cached data and tell the customer why, once.
  useEffect(() => {
    if (authState !== 'SESSION_EXPIRED') {
      handledExpiry.current = false;
      return;
    }
    if (handledExpiry.current) return;
    handledExpiry.current = true;
    queryClient.clear();
    useUIStore.getState().showToast({ type: 'info', title: sessionEndMessage(sessionEndReason ?? undefined) });
  }, [authState, sessionEndReason]);

  // Back from background: refresh ahead of expiry / retry a refresh that failed offline.
  useAppState(() => recoverSession('foreground'), undefined);

  // Network back: same.
  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener((net) => {
      const online = Boolean(net.isConnected) && net.isInternetReachable !== false;
      if (online && wasOffline) recoverSession('reconnect');
      wasOffline = !online;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // 1. Never navigate while restoring or while a refresh / outage is being handled
    if (
      authState === 'INITIALIZING' ||
      authState === 'idle' ||
      authState === 'loading' ||
      authState === 'REFRESHING_TOKEN' ||
      authState === 'TEMPORARILY_UNAVAILABLE'
    ) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const authScreen = segments[1];

    // 2. Confirmed signed out (logout, or the server ended the session): Welcome, once
    if (isSignedOutState(authState) && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    // 3. Authenticated: manage transitions within the auth group
    if (authState === 'AUTHENTICATED' || authState === 'authenticated') {
      // Allow OTP completion cascade to run smoothly
      if (authScreen === 'otp') return;

      const isNewUser = useAuthStore.getState().isNewUser;

      if (inAuthGroup) {
        // Allow newly registered users to complete name and location setup
        if (authScreen === 'name' || authScreen === 'location-permission') {
          return;
        }

        // Redirect away from login entry screens (welcome, phone)
        if (isNewUser) {
          router.replace('/(auth)/name');
        } else {
          router.replace('/(tabs)' as any);
        }
      }
      // If already outside auth group (e.g. tabs, booking, profile), preserve their current screen!
    }
  }, [authState, segments, router]);

  return <>{children}</>;
};
