import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore, useLocationStore } from '../store';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const segments = useSegments();
  const authState = useAuthStore(state => state.authState);
  const hydrateAuth = useAuthStore(state => state.hydrate);
  const hydrateLocation = useLocationStore(state => state.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateLocation();
  }, [hydrateAuth, hydrateLocation]);

  useEffect(() => {
    // 1. Never make navigation decisions while authentication is initializing
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

    // 2. Confirmed unauthenticated: send to Welcome screen ONLY if not already in auth stack
    if ((authState === 'UNAUTHENTICATED' || authState === 'unauthenticated') && !inAuthGroup) {
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
