import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Coordinates } from '../../types/location.types';
import { extractCityOrAreaName, extractFullAddressLine } from '../../utils/locationUtils';
import { localStorage } from '../storage/local.storage';

export interface LocationPermissionState {
  status: Location.PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  servicesEnabled: boolean;
}

export interface GeocodedAddressResult {
  cityName: string;
  addressLine: string;
  country: string;
  formattedAddress: string;
  raw?: Location.LocationGeocodedAddress | undefined;
}

export interface GetPositionOptions {
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  useCacheFirst?: boolean;
}

// Global in-flight acquisition promise to deduplicate concurrent hardware GPS requests
let activePositionPromise: Promise<Coordinates | null> | null = null;

// Timeout wrapper helper
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
};

export const locationService = {
  /**
   * Check both device hardware location services and app foreground permission status.
   */
  async checkLocationState(): Promise<LocationPermissionState> {
    try {
      const [servicesEnabled, permission] = await Promise.all([
        Location.hasServicesEnabledAsync().catch(() => false),
        Location.getForegroundPermissionsAsync().catch(() => ({
          status: Location.PermissionStatus.UNDETERMINED,
          granted: false,
          canAskAgain: true,
        })),
      ]);

      return {
        status: permission.status,
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        servicesEnabled,
      };
    } catch {
      return {
        status: Location.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        servicesEnabled: false,
      };
    }
  },

  /**
   * Request foreground location permission.
   */
  async requestPermission(): Promise<LocationPermissionState> {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
      const permission = await Location.requestForegroundPermissionsAsync();

      return {
        status: permission.status,
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        servicesEnabled,
      };
    } catch {
      return {
        status: Location.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        servicesEnabled: false,
      };
    }
  },

  /**
   * Cross-platform settings redirection when permissions are permanently denied.
   */
  openSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:').catch(() => {});
    } else {
      Linking.openSettings().catch(() => {});
    }
  },

  /**
   * Tiered GPS position acquisition with:
   * 1. Concurrent request deduplication
   * 2. Cache-first strategy (last known position for 0ms cold start)
   * 3. Fresh GPS lock with 8-second timeout guard
   * 4. Automatic low-accuracy degradation if balanced times out
   */
  async getCurrentPosition(options?: GetPositionOptions): Promise<Coordinates | null> {
    const {
      timeoutMs = 8000,
      useCacheFirst = true,
      enableHighAccuracy = false,
    } = options || {};

    // Deduplicate only if an existing request is active and compatible with freshness requirement
    if (activePositionPromise && useCacheFirst) {
      return activePositionPromise;
    }

    const acquisitionPromise = (async (): Promise<Coordinates | null> => {
      try {
        // Step 1: Verify hardware services & permission
        const state = await this.checkLocationState();
        if (!state.servicesEnabled || !state.granted) {
          // Only fall back to cache if caller explicitly allows cached data
          if (useCacheFirst) {
            const cached = localStorage.getCachedLastLocation();
            if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number') {
              return { lat: cached.latitude, lng: cached.longitude };
            }
          }
          return null;
        }

        // Step 2: Cache-first instant return (last known position)
        if (useCacheFirst) {
          try {
            const lastKnown = await Location.getLastKnownPositionAsync({
              maxAge: 120000, // 2 minutes freshness
            });
            if (lastKnown?.coords) {
              const cachedCoords: Coordinates = {
                lat: lastKnown.coords.latitude,
                lng: lastKnown.coords.longitude,
              };
              localStorage.cacheLastLocation({
                latitude: cachedCoords.lat,
                longitude: cachedCoords.lng,
              });
              return cachedCoords;
            }
          } catch {
            // Ignore failure and continue to fresh lock
          }
        }

        // Step 3: Fresh position acquisition with timeout guard
        const accuracy = enableHighAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced;

        const freshLocationPromise = Location.getCurrentPositionAsync({
          accuracy,
        });

        const location = await withTimeout(freshLocationPromise, timeoutMs, null);

        if (location?.coords) {
          const coords: Coordinates = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          localStorage.cacheLastLocation({
            latitude: coords.lat,
            longitude: coords.lng,
          });
          return coords;
        }

        // Step 4: Degraded fallback if Balanced/High accuracy timed out (e.g. indoors/basement)
        try {
          const degradedPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          });
          const degraded = await withTimeout(degradedPromise, 3000, null);
          if (degraded?.coords) {
            const coords: Coordinates = {
              lat: degraded.coords.latitude,
              lng: degraded.coords.longitude,
            };
            localStorage.cacheLastLocation({
              latitude: coords.lat,
              longitude: coords.lng,
            });
            return coords;
          }
        } catch {
          // Ignore degraded failure
        }

        // Step 5: Fallback to last cached position ONLY when cache-first is allowed
        if (useCacheFirst) {
          const cached = localStorage.getCachedLastLocation();
          if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number') {
            return { lat: cached.latitude, lng: cached.longitude };
          }
        }

        return null;
      } catch (err) {
        console.warn('[LocationService] Error acquiring current position:', err);
        if (useCacheFirst) {
          const cached = localStorage.getCachedLastLocation();
          if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number') {
            return { lat: cached.latitude, lng: cached.longitude };
          }
        }
        return null;
      } finally {
        activePositionPromise = null;
      }
    })();

    activePositionPromise = acquisitionPromise;
    return acquisitionPromise;
  },

  /**
   * Reverse geocodes coordinates to a human-readable city & address line.
   */
  async reverseGeocode(coords: Coordinates): Promise<GeocodedAddressResult> {
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });

      const place = geocode && geocode.length > 0 ? geocode[0] : undefined;
      const cityName = extractCityOrAreaName(place);
      const addressLine = extractFullAddressLine(place);
      const country = place?.country || 'Pakistan';
      const formattedAddress = [addressLine, cityName, country].filter(Boolean).join(', ');

      return {
        cityName,
        addressLine,
        country,
        formattedAddress,
        ...(place ? { raw: place } : {}),
      };
    } catch (err) {
      console.warn('[LocationService] Reverse geocode error:', err);
      return {
        cityName: 'Current Area',
        addressLine: 'Current GPS Location',
        country: 'Pakistan',
        formattedAddress: `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      };
    }
  },

  /**
   * Helper to retrieve Google Maps API key from expo-constants or env
   */
  getGoogleMapsApiKey(): string {
    const configKey = Constants.expoConfig?.extra?.googleMapsKey;
    const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY;
    return configKey || envKey || '';
  },
};
