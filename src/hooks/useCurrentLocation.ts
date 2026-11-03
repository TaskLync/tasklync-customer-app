import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocationStore } from '../store/location.store';
import { locationService, LocationPermissionState } from '../services/location/location.service';
import {
  Coordinates,
  FreshLocationOptions,
  FreshLocationResult,
  LocationError,
  VerifiedLocation,
} from '../types/location.types';

export interface UseCurrentLocationReturn {
  currentLocation: Coordinates | null;
  verifiedLocation: VerifiedLocation | null;
  accuracy: number | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  isPermissionGranted: boolean;
  isPermissionDenied: boolean;
  isFetching: boolean;
  error: LocationError | null;
  errorMessage: string | null;
  fetchLocation: (options?: FreshLocationOptions) => Promise<Coordinates | null>;
  acquireLocation: (options?: FreshLocationOptions) => Promise<FreshLocationResult>;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<LocationPermissionState>;
  openSettings: () => void;
  clearError: () => void;
}

export function useCurrentLocation(): UseCurrentLocationReturn {
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<LocationError | null>(null);
  const [verifiedLocation, setVerifiedLocation] = useState<VerifiedLocation | null>(null);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const setPermissionStatus = useLocationStore((s) => s.setPermissionStatus);
  const setIsServicesEnabled = useLocationStore((s) => s.setIsServicesEnabled);
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);

  const checkPermission = useCallback(async (): Promise<LocationPermissionState> => {
    try {
      const state = await locationService.checkLocationState();
      if (isMountedRef.current) {
        setPermissionStatus(
          state.status === 'granted'
            ? 'granted'
            : state.status === 'denied'
            ? 'denied'
            : 'undetermined'
        );
        setIsServicesEnabled(state.servicesEnabled);
      }
      return state;
    } catch {
      return {
        status: 'undetermined' as any,
        granted: false,
        canAskAgain: true,
        servicesEnabled: false,
      };
    }
  }, [setIsServicesEnabled, setPermissionStatus]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await locationService.requestPermission();
      if (isMountedRef.current) {
        setPermissionStatus(
          result.status === 'granted'
            ? 'granted'
            : result.status === 'denied'
            ? 'denied'
            : 'undetermined'
        );
        setIsServicesEnabled(result.servicesEnabled);
      }
      return result.granted;
    } catch {
      if (isMountedRef.current) {
        setPermissionStatus('denied');
      }
      return false;
    }
  }, [setIsServicesEnabled, setPermissionStatus]);

  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  /**
   * Acquire fresh, high-confidence GPS coordinates.
   * Returns rich result with typed error details if failed.
   */
  const acquireLocation = useCallback(
    async (options?: FreshLocationOptions): Promise<FreshLocationResult> => {
      if (isMountedRef.current) {
        setIsFetching(true);
        setError(null);
      }

      try {
        // First verify permission
        const state = await locationService.checkLocationState();
        if (isMountedRef.current) {
          setPermissionStatus(
            state.status === 'granted'
              ? 'granted'
              : state.status === 'denied'
              ? 'denied'
              : 'undetermined'
          );
          setIsServicesEnabled(state.servicesEnabled);
        }

        if (!state.granted) {
          const granted = await requestPermission();
          if (!granted) {
            const permError: LocationError = {
              code: state.canAskAgain ? 'PERMISSION_DENIED' : 'PERMISSION_BLOCKED',
              message: 'Location permission was denied',
              userMessage: state.canAskAgain
                ? 'Location permission is required to detect your current position.'
                : 'Location permission is permanently disabled. Please enable it in Settings.',
              canAskAgain: state.canAskAgain,
            };
            if (isMountedRef.current) {
              setError(permError);
            }
            return { success: false, error: permError };
          }
        }

        const freshResult = await locationService.acquireFreshGPSPosition(options);

        if (!isMountedRef.current) {
          return freshResult;
        }

        if (freshResult.success) {
          setVerifiedLocation(freshResult.location);
          setCurrentLocation({
            lat: freshResult.location.lat,
            lng: freshResult.location.lng,
          });
          setError(null);
          return freshResult;
        } else {
          setError(freshResult.error);
          return freshResult;
        }
      } catch (err: any) {
        const fallbackError: LocationError = {
          code: 'UNKNOWN',
          message: err?.message || 'Failed to acquire fresh GPS location.',
          userMessage: 'Unable to detect your GPS position. Please try again.',
        };
        if (isMountedRef.current) {
          setError(fallbackError);
        }
        return { success: false, error: fallbackError };
      } finally {
        if (isMountedRef.current) {
          setIsFetching(false);
        }
      }
    },
    [requestPermission, setCurrentLocation, setIsServicesEnabled, setPermissionStatus]
  );

  /**
   * Convenience fetcher returning Coordinates or null
   */
  const fetchLocation = useCallback(
    async (options?: FreshLocationOptions): Promise<Coordinates | null> => {
      const result = await acquireLocation(options);
      if (result.success) {
        return {
          lat: result.location.lat,
          lng: result.location.lng,
        };
      }
      return null;
    },
    [acquireLocation]
  );

  return {
    currentLocation,
    verifiedLocation,
    accuracy: verifiedLocation?.accuracy ?? null,
    permissionStatus,
    isPermissionGranted: permissionStatus === 'granted',
    isPermissionDenied: permissionStatus === 'denied',
    isFetching,
    error,
    errorMessage: error?.userMessage || error?.message || null,
    fetchLocation,
    acquireLocation,
    requestPermission,
    checkPermission,
    openSettings: locationService.openSettings,
    clearError,
  };
}
