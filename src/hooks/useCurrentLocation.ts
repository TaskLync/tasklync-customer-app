import { useState, useCallback } from 'react';
import { useLocationStore } from '../store/location.store';
import { locationService } from '../services/location/location.service';
import { Coordinates } from '../types/location.types';

export function useCurrentLocation() {
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const setPermissionStatus = useLocationStore((s) => s.setPermissionStatus);
  const setIsServicesEnabled = useLocationStore((s) => s.setIsServicesEnabled);
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);

  const checkPermission = useCallback(async () => {
    try {
      const state = await locationService.checkLocationState();
      setPermissionStatus(
        state.status === 'granted' ? 'granted' : state.status === 'denied' ? 'denied' : 'undetermined'
      );
      setIsServicesEnabled(state.servicesEnabled);
      return state.status;
    } catch {
      return 'undetermined';
    }
  }, [setIsServicesEnabled, setPermissionStatus]);

  const requestPermission = useCallback(async () => {
    try {
      const result = await locationService.requestPermission();
      setPermissionStatus(
        result.status === 'granted' ? 'granted' : result.status === 'denied' ? 'denied' : 'undetermined'
      );
      setIsServicesEnabled(result.servicesEnabled);
      return result.granted;
    } catch {
      setPermissionStatus('denied');
      return false;
    }
  }, [setIsServicesEnabled, setPermissionStatus]);

  const fetchLocation = useCallback(async (): Promise<Coordinates | null> => {
    setIsFetching(true);
    setError(null);

    try {
      const state = await locationService.checkLocationState();
      setPermissionStatus(
        state.status === 'granted' ? 'granted' : state.status === 'denied' ? 'denied' : 'undetermined'
      );
      setIsServicesEnabled(state.servicesEnabled);

      if (!state.granted) {
        const granted = await requestPermission();
        if (!granted) {
          setError('Location permission was denied');
          return null;
        }
      }

      if (!state.servicesEnabled) {
        setError('Location services are disabled on this device');
        return null;
      }

      const coords = await locationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeoutMs: 8000,
        useCacheFirst: false,
      });

      if (coords) {
        setCurrentLocation(coords);
        return coords;
      }

      setError('Could not retrieve current GPS location. Please check your signal.');
      return null;
    } catch (err: any) {
      setError(err?.message || 'Failed to obtain current GPS location');
      return null;
    } finally {
      setIsFetching(false);
    }
  }, [requestPermission, setCurrentLocation, setIsServicesEnabled, setPermissionStatus]);

  return {
    currentLocation,
    permissionStatus,
    isPermissionGranted: permissionStatus === 'granted',
    isPermissionDenied: permissionStatus === 'denied',
    isFetching,
    error,
    fetchLocation,
    requestPermission,
    checkPermission,
    openSettings: locationService.openSettings,
  };
}
