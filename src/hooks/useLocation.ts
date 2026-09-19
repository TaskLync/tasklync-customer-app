import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useLocationStore } from '../store/location.store';
import { locationService, LocationPermissionState } from '../services/location/location.service';
import { Coordinates } from '../types/location.types';
import { Address } from '../types/address.types';
import { validateServiceArea } from '../config/serviceArea.config';

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
  const currentCity = useLocationStore((s) => s.currentCity);
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

        const coords = await locationService.getCurrentPosition({
          enableHighAccuracy,
          timeoutMs: 8000,
          useCacheFirst: !force,
        });

        if (coords) {
          store.setCurrentLocation(coords);

          // Reverse geocode in background without blocking position acquisition
          locationService
            .reverseGeocode(coords)
            .then((res) => {
              const cityName = res?.cityName?.trim();
              if (cityName && cityName !== 'Current Area' && cityName !== 'Your area') {
                useLocationStore.getState().setCurrentCity(cityName);
              } else if (!useLocationStore.getState().currentCity) {
                useLocationStore.getState().setCurrentCity('Current Location');
              }
            })
            .catch(() => {
              if (!useLocationStore.getState().currentCity) {
                useLocationStore.getState().setCurrentCity('Current Location');
              }
            });

          return coords;
        }

        if (force) {
          return null;
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

  // Derive city and address labels with stable fallbacks to prevent flickering
  const displayCity: string =
    locationMode === 'address' && selectedAddress
      ? selectedAddress.city || selectedAddress.address_line || 'Saved Address'
      : currentCity && currentCity !== 'Current Area' && currentCity !== 'Your area'
      ? currentCity
      : currentLocation
      ? 'Current Location'
      : isLocating
      ? 'Locating...'
      : 'Select location';

  const displayAddressLine: string =
    locationMode === 'address' && selectedAddress
      ? selectedAddress.address_line || selectedAddress.city || 'Saved Address'
      : currentCity && currentCity !== 'Current Area' && currentCity !== 'Your area'
      ? currentCity
      : currentLocation
      ? 'Current Location'
      : isLocating
      ? 'Locating...'
      : 'Select location';

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
    cityName: displayCity,
    displayAddressLine,
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
