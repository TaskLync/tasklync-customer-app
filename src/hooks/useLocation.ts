import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useLocationStore } from '../store/location.store';
import { locationService, LocationPermissionState } from '../services/location/location.service';
import { Coordinates } from '../types/location.types';
import { Address } from '../types/address.types';
import { validateServiceArea } from '../config/serviceArea.config';
import { resolveCurrentAddress, addressMatchesLocation } from '../services/location/currentAddress';

export interface UseLocationOptions {
  autoFetch?: boolean;
  enableHighAccuracy?: boolean;
}

export const useLocation = (options?: UseLocationOptions) => {
  const { autoFetch = true, enableHighAccuracy = false } = options || {};

  // Fine-grained selectors prevent unnecessary re-renders across the tree
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const isServicesEnabled = useLocationStore((s) => s.isServicesEnabled);
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const liveLocation = useLocationStore((s) => s.liveLocation);
  const currentCity = useLocationStore((s) => s.currentCity);
  const currentAddress = useLocationStore((s) => s.currentAddress);
  const locationMode = useLocationStore((s) => s.locationMode);
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const isLocating = useLocationStore((s) => s.isLocating);

  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const hasAutoFetchedRef = useRef(false);

  /**
   * Acquire fresh GPS position, perform reverse geocode, and update store
   */
  const getCurrentPosition = useCallback(
    async (force = false): Promise<Coordinates | null> => {
      const store = useLocationStore.getState();

      if (isFetchingRef.current && !force) {
        return store.currentLocation;
      }

      // Only show loading indicator if we don't already have a resolved position,
      // or if the user explicitly triggered a forced refresh
      const hasExistingLocation = Boolean(store.currentLocation);
      if (!hasExistingLocation || force) {
        store.setIsLocating(true);
      }

      isFetchingRef.current = true;
      setError(null);

      try {
        const state = await locationService.checkLocationState();
        store.setPermissionStatus(
          state.status === 'granted' ? 'granted' : state.status === 'denied' ? 'denied' : 'undetermined'
        );
        store.setIsServicesEnabled(state.servicesEnabled);

        if (!state.servicesEnabled) {
          setError('Location services are turned off on your device.');
          store.setIsLocating(false);
          isFetchingRef.current = false;
          return store.currentLocation;
        }

        if (!state.granted) {
          setError('Location permission has not been granted.');
          store.setIsLocating(false);
          isFetchingRef.current = false;
          return store.currentLocation;
        }

        if (force) {
          const freshResult = await locationService.acquireFreshGPSPosition();
          if (freshResult.success) {
            const coords: Coordinates = {
              lat: freshResult.location.lat,
              lng: freshResult.location.lng,
            };
            store.setLiveLocation(coords);

            // Resolve the readable address in the background without blocking acquisition
            void resolveCurrentAddress(coords);

            return coords;
          } else {
            setError(freshResult.error.userMessage);
            return null;
          }
        }

        const coords = await locationService.getCurrentPosition({
          enableHighAccuracy,
          timeoutMs: 8000,
          useCacheFirst: true,
        });

        if (coords) {
          store.setLiveLocation(coords);

          // Resolve the readable address in the background without blocking acquisition
          void resolveCurrentAddress(coords);

          return coords;
        }

        return store.currentLocation;
      } catch (err: any) {
        console.warn('[useLocation] Failed to fetch position:', err);
        setError(err?.message || 'Failed to detect location');
        if (force) {
          return null;
        }
        return store.currentLocation;
      } finally {
        store.setIsLocating(false);
        isFetchingRef.current = false;
      }
    },
    [enableHighAccuracy]
  );

  /**
   * Request permission and initiate location lock if granted
   */
  const requestLocation = useCallback(async (): Promise<LocationPermissionState> => {
    const result = await locationService.requestPermission();
    const store = useLocationStore.getState();
    store.setPermissionStatus(
      result.status === 'granted' ? 'granted' : result.status === 'denied' ? 'denied' : 'undetermined'
    );
    store.setIsServicesEnabled(result.servicesEnabled);

    if (result.granted && result.servicesEnabled) {
      await getCurrentPosition(true);
    }

    return result;
  }, [getCurrentPosition]);

  /**
   * Switch to GPS mode and fetch fresh coordinates
   */
  const refreshLocation = useCallback(async (): Promise<Coordinates | null> => {
    const store = useLocationStore.getState();
    store.setLocationMode('gps');
    store.setSelectedAddress(null);
    return getCurrentPosition(true);
  }, [getCurrentPosition]);

  /**
   * Select a saved delivery address (switches locationMode to 'address')
   */
  const selectAddress = useCallback(
    (addr: Address) => {
      const store = useLocationStore.getState();
      store.setSelectedAddress(addr);
      store.setLocationMode('address');
      if (addr.city) {
        store.setCurrentCity(addr.city);
      }
    },
    []
  );

  // Derive active coordinates & label based on locationMode
  const activeCoordinates: Coordinates | null =
    locationMode === 'address' &&
    selectedAddress &&
    !isNaN(Number(selectedAddress.lat)) &&
    !isNaN(Number(selectedAddress.lng))
      ? { lat: Number(selectedAddress.lat), lng: Number(selectedAddress.lng) }
      : currentLocation;

  // Readable address for the live/cached GPS position — only if it was resolved for THIS position.
  const resolvedGpsAddress = addressMatchesLocation(currentAddress, currentLocation) ? currentAddress : null;

  // Labels never invent a place: resolved text, else the stored city, else a neutral state label.
  const gpsCity = resolvedGpsAddress?.city || currentCity || '';
  const displayCity: string =
    locationMode === 'address' && selectedAddress
      ? selectedAddress.city || selectedAddress.address_line || 'Saved Address'
      : gpsCity
      ? gpsCity
      : currentLocation
      ? 'Current Location'
      : isLocating
      ? 'Locating...'
      : 'Select location';

  const displayAddressLine: string =
    locationMode === 'address' && selectedAddress
      ? selectedAddress.address_line || selectedAddress.city || 'Saved Address'
      : resolvedGpsAddress
      ? resolvedGpsAddress.address_line
      : currentLocation
      ? 'Current Location'
      : isLocating
      ? 'Locating...'
      : 'Select location';

  // Keep the readable address in step with the GPS position (cold start from cache, moved device).
  // Only instances that own location fetching drive this; lookups are cached/deduplicated anyway.
  const gpsLat = currentLocation?.lat;
  const gpsLng = currentLocation?.lng;
  useEffect(() => {
    if (!autoFetch || locationMode !== 'gps') return;
    if (typeof gpsLat !== 'number' || typeof gpsLng !== 'number') return;
    void resolveCurrentAddress({ lat: gpsLat, lng: gpsLng });
  }, [autoFetch, locationMode, gpsLat, gpsLng]);

  // Mount effect & AppState change listener
  useEffect(() => {
    let isMounted = true;

    const checkAndSync = async (isInitial = false) => {
      if (!isMounted) return;
      try {
        const state = await locationService.checkLocationState();
        if (!isMounted) return;

        const store = useLocationStore.getState();
        store.setPermissionStatus(
          state.status === 'granted' ? 'granted' : state.status === 'denied' ? 'denied' : 'undetermined'
        );
        store.setIsServicesEnabled(state.servicesEnabled);

        // Only auto-fetch GPS if mode is 'gps', autoFetch is enabled, and permission is granted
        if (autoFetch && store.locationMode === 'gps' && state.granted && state.servicesEnabled) {
          if (isInitial && !hasAutoFetchedRef.current) {
            hasAutoFetchedRef.current = true;
            await getCurrentPosition(false);
          }
        }
      } catch (err) {
        console.warn('[useLocation] Check error:', err);
      }
    };

    checkAndSync(true);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const store = useLocationStore.getState();
        // Only re-check on foreground if permission was not granted or location is missing
        if (store.locationMode === 'gps' && (store.permissionStatus !== 'granted' || !store.currentLocation)) {
          checkAndSync(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [autoFetch, getCurrentPosition]);

  const serviceAreaValidation = activeCoordinates
    ? validateServiceArea(activeCoordinates)
    : null;

  return {
    location: activeCoordinates,
    gpsLocation: currentLocation,
    /** Verified GPS fix from this session, or null. Safe to show as "you are here". */
    liveLocation,
    cityName: displayCity,
    displayAddressLine,
    /** True when displayAddressLine is a resolved street/place address (not a neutral placeholder). */
    hasResolvedAddress: locationMode === 'address' ? Boolean(selectedAddress?.address_line) : Boolean(resolvedGpsAddress),
    locationMode,
    selectedAddress,
    permissionStatus,
    isPermissionGranted: permissionStatus === 'granted',
    isPermissionDenied: permissionStatus === 'denied',
    isServicesEnabled,
    isLocating,
    isServiceable: serviceAreaValidation ? serviceAreaValidation.isServiceable : true,
    serviceAreaValidation,
    error,
    getCurrentPosition,
    requestLocation,
    refreshLocation,
    selectAddress,
    openSettings: locationService.openSettings,
    checkLocationState: locationService.checkLocationState,
  };
};
