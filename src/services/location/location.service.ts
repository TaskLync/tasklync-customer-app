import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import {
  Coordinates,
  VerifiedLocation,
  FreshLocationOptions,
  FreshLocationResult,
  LocationPrecision,
} from '../../types/location.types';
import { resolveAddress, isResolvedAddress } from '../maps/addressResolver';
import {
  classifyPermissionPrecision,
  classifyFix,
  canSettleImmediately,
  pickBestConsistentSample,
  LOCATION_THRESHOLDS,
  type FixSample,
} from '../../utils/locationConfidence';

export interface LocationPermissionState {
  status: Location.PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  servicesEnabled: boolean;
  /** precise / approximate (Android "Approximate", iOS "Precise: off") / unknown */
  precision: LocationPrecision;
}

export interface GeocodedAddressResult {
  cityName: string;
  addressLine: string;
  country: string;
  formattedAddress: string;
  /** false when no provider could produce a readable address (fields are then empty) */
  resolved: boolean;
}

export interface GetPositionOptions {
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  useCacheFirst?: boolean;
  targetAccuracyMeters?: number;
  maxAcceptableAccuracyMeters?: number;
  maxAgeMs?: number;
  allowMock?: boolean;
}

// In-flight acquisitions, keyed by their options: identical requests share one hardware session,
// a request with different requirements (threshold, dialog policy) is not silently given another's.
const activeFreshPositionPromises = new Map<string, Promise<FreshLocationResult>>();
let activeLegacyPositionPromise: Promise<Coordinates | null> | null = null;

const DEFAULT_TARGET_ACCURACY_METERS = LOCATION_THRESHOLDS.pin.targetAccuracyM; // 20 m
const DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS = LOCATION_THRESHOLDS.pin.maxAccuracyM; // 35 m
const DEFAULT_TIMEOUT_MS = 9000;
const DEFAULT_MAX_AGE_MS = LOCATION_THRESHOLDS.pin.maxAgeMs; // 10 s
/** With approximate permission, waiting for a street-level fix is pointless: give up quickly. */
const APPROXIMATE_PERMISSION_TIMEOUT_MS = 4000;

const toVerified = (loc: Location.LocationObject): VerifiedLocation => ({
  lat: loc.coords.latitude,
  lng: loc.coords.longitude,
  accuracy: Math.round((loc.coords.accuracy ?? Number.POSITIVE_INFINITY) * 10) / 10,
  timestamp: loc.timestamp || Date.now(),
  altitude: loc.coords.altitude ?? null,
  altitudeAccuracy: loc.coords.altitudeAccuracy ?? null,
  heading: loc.coords.heading ?? null,
  speed: loc.coords.speed ?? null,
  isMocked: loc.mocked ?? false,
});

export const locationService = {
  /**
   * Check both device hardware location services and app foreground permission status.
   */
  async checkLocationState(): Promise<LocationPermissionState> {
    try {
      const [servicesEnabled, permission] = await Promise.all([
        Location.hasServicesEnabledAsync().catch(() => false),
        Location.getForegroundPermissionsAsync().catch(
          () =>
            ({
              status: Location.PermissionStatus.UNDETERMINED,
              granted: false,
              canAskAgain: true,
            }) as Location.LocationPermissionResponse
        ),
      ]);

      return {
        status: permission.status,
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        servicesEnabled,
        precision: classifyPermissionPrecision(permission),
      };
    } catch {
      return {
        status: Location.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        servicesEnabled: false,
        precision: 'unknown',
      };
    }
  },

  /**
   * Request foreground location permission. On Android 12+ calling this again while only
   * "Approximate" is granted shows the system dialog that lets the user upgrade to precise.
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
        precision: classifyPermissionPrecision(permission),
      };
    } catch {
      return {
        status: Location.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        servicesEnabled: false,
        precision: 'unknown',
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
   * Cheap, battery-free hint for where to CENTRE a map: the OS last-known fix if it is recent and
   * no worse than the centring threshold (or any recent fix under approximate permission).
   * Never use the result as an address or a "you are here" claim.
   */
  async getMapCentreHint(): Promise<VerifiedLocation | null> {
    try {
      const state = await this.checkLocationState();
      if (!state.granted) return null;
      const approximate = state.precision === 'approximate';
      const t = approximate ? LOCATION_THRESHOLDS.centreApproximate : LOCATION_THRESHOLDS.centre;
      const last = await Location.getLastKnownPositionAsync({ maxAge: t.maxAgeMs, requiredAccuracy: t.maxAccuracyM });
      if (!last?.coords) return null;
      const v = toVerified(last);
      const tier = classifyFix(v, Date.now(), { precision: state.precision });
      return tier === 'rejected' ? null : v;
    } catch {
      return null;
    }
  },

  /**
   * Production-grade, high-confidence GPS position acquisition:
   * 1. De-duplication per option set (one hardware session per identical request)
   * 2. Permission, precision (approximate vs precise) & provider validation
   * 3. Android high-accuracy dialog (only when the caller allows it)
   * 4. Multi-sample convergence via watchPositionAsync + one-shot racer
   * 5. Accuracy radius validation (target ≤ 20 m, cut-off ≤ 35 m by default)
   * 6. Timestamp freshness validation (rejects stale provider fixes)
   * 7. Mock location rejection
   * 8. Jump filter: a lone outlier never settles the acquisition on its own
   * 9. Guaranteed subscription cleanup
   * 10. Never reports a low-confidence fix as verified — it is returned separately as
   *     `error.approximateLocation` so callers may centre the map with it, nothing more.
   */
  async acquireFreshGPSPosition(options?: FreshLocationOptions): Promise<FreshLocationResult> {
    const {
      timeoutMs = DEFAULT_TIMEOUT_MS,
      targetAccuracyMeters = DEFAULT_TARGET_ACCURACY_METERS,
      maxAcceptableAccuracyMeters = DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS,
      maxAgeMs = DEFAULT_MAX_AGE_MS,
      allowMock = false,
      mayShowUserSettingsDialog = true,
    } = options || {};

    const key = JSON.stringify([timeoutMs, targetAccuracyMeters, maxAcceptableAccuracyMeters, maxAgeMs, allowMock, mayShowUserSettingsDialog]);
    const existing = activeFreshPositionPromises.get(key);
    if (existing) return existing;

    const acquisition = (async (): Promise<FreshLocationResult> => {
      let watcherSubscription: Location.LocationSubscription | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

      try {
        // Step 1: Validate permissions & hardware providers
        const state = await this.checkLocationState();

        if (!state.servicesEnabled) {
          const disabled: FreshLocationResult = {
            success: false,
            error: {
              code: 'SERVICES_DISABLED',
              message: 'Location services are disabled on this device.',
              userMessage:
                'Device location services (GPS) are turned off. Please enable GPS in your device settings.',
            },
          };
          // On Android, prompt the user with the Google Play Services high accuracy dialog
          if (Platform.OS === 'android' && mayShowUserSettingsDialog) {
            try {
              await Location.enableNetworkProviderAsync();
              const recheck = await Location.hasServicesEnabledAsync().catch(() => false);
              if (!recheck) return disabled;
            } catch {
              return disabled;
            }
          } else {
            return disabled;
          }
        }

        if (!state.granted) {
          return {
            success: false,
            error: {
              code: state.canAskAgain ? 'PERMISSION_DENIED' : 'PERMISSION_BLOCKED',
              message: 'Location permission was not granted.',
              userMessage: state.canAskAgain
                ? 'Location permission is required to detect your current position.'
                : 'Location permission is permanently disabled. Please enable it in Settings.',
              canAskAgain: state.canAskAgain,
            },
          };
        }

        const approximateOnly = state.precision === 'approximate';
        const effectiveTimeoutMs = approximateOnly ? Math.min(timeoutMs, APPROXIMATE_PERMISSION_TIMEOUT_MS) : timeoutMs;

        // Step 2: Progressive GPS convergence acquisition
        return await new Promise<FreshLocationResult>((resolve) => {
          let hasSettled = false;
          const samples: FixSample[] = [];
          let lastSample: FixSample | null = null;
          let mockDetected = false;

          const cleanup = () => {
            if (timeoutTimer) {
              clearTimeout(timeoutTimer);
              timeoutTimer = null;
            }
            if (watcherSubscription) {
              watcherSubscription.remove();
              watcherSubscription = null;
            }
          };

          const settle = (result: FreshLocationResult) => {
            if (hasSettled) return;
            hasSettled = true;
            cleanup();
            resolve(result);
          };

          const evaluateSample = (loc: Location.LocationObject) => {
            if (hasSettled || !loc || !loc.coords) return;
            const { latitude, longitude, accuracy } = loc.coords;

            // Reject invalid numerical coordinates / accuracy
            if (typeof latitude !== 'number' || isNaN(latitude) || typeof longitude !== 'number' || isNaN(longitude)) {
              return;
            }
            if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0) return;

            // Mock location rejection
            if (loc.mocked) {
              mockDetected = true;
              if (!allowMock) return;
            }

            // Freshness validation (reject old cached fixes delivered by the OS provider).
            // A fix without a timestamp cannot be proven fresh.
            if (!loc.timestamp || Date.now() - loc.timestamp > maxAgeMs) return;

            const candidate = toVerified(loc);
            samples.push(candidate);
            const previous = lastSample;
            lastSample = candidate;

            // Immediate resolution only for a precise-permission fix at target accuracy that is
            // not an outlier relative to the previous sample in this acquisition.
            if (!approximateOnly && canSettleImmediately(candidate, previous, targetAccuracyMeters)) {
              settle({ success: true, location: candidate, precision: state.precision });
            }
          };

          // Step 3: Start hardware watcher (honours the caller's dialog policy)
          const accuracyMode = approximateOnly
            ? Location.Accuracy.Balanced
            : Platform.OS === 'ios'
            ? Location.Accuracy.BestForNavigation
            : Location.Accuracy.Highest;

          Location.watchPositionAsync(
            {
              accuracy: accuracyMode,
              timeInterval: 500,
              distanceInterval: 0,
              mayShowUserSettingsDialog,
            },
            (location) => evaluateSample(location)
          )
            .then((subscription) => {
              if (hasSettled) {
                subscription.remove();
              } else {
                watcherSubscription = subscription;
              }
            })
            .catch((err) => {
              console.warn('[LocationService] watchPositionAsync error:', err?.message || err);
            });

          // Step 4: Parallel one-shot racer in case watchPositionAsync is delayed
          Location.getCurrentPositionAsync({ accuracy: accuracyMode })
            .then((oneShot) => evaluateSample(oneShot))
            .catch(() => {
              // Ignore one-shot failure; watcher continues
            });

          // Step 5: Timeout — decide with everything collected
          timeoutTimer = setTimeout(() => {
            if (hasSettled) return;
            const best = pickBestConsistentSample(samples) as VerifiedLocation | null;
            const now = Date.now();

            if (approximateOnly) {
              const approx = best && classifyFix(best, now, { precision: 'approximate', allowMock }) !== 'rejected' ? best : undefined;
              settle({
                success: false,
                error: {
                  code: 'APPROXIMATE_PERMISSION',
                  message: 'Only approximate location permission is granted.',
                  userMessage:
                    'Tasklync only has your approximate location. Allow "Precise location" so we can place the pin at your door, or move the map to your address.',
                  accuracy: best?.accuracy ?? null,
                  approximateLocation: approx,
                },
              });
              return;
            }

            if (best && best.accuracy <= maxAcceptableAccuracyMeters) {
              settle({ success: true, location: best, precision: state.precision });
              return;
            }

            if (best) {
              const approx = classifyFix(best, now, { allowMock }) === 'approximate' ? best : undefined;
              settle({
                success: false,
                error: {
                  code: 'LOW_ACCURACY',
                  message: `GPS accuracy radius of ${Math.round(best.accuracy)}m exceeds acceptable threshold (${maxAcceptableAccuracyMeters}m).`,
                  userMessage: approx
                    ? `We could only find your approximate location (±${Math.round(best.accuracy)} m). Move the map so the pin sits on your door.`
                    : `Weak GPS signal (accuracy ±${Math.round(best.accuracy)}m). Please move near a window or outdoors and try again, or place the pin on the map.`,
                  accuracy: best.accuracy,
                  approximateLocation: approx,
                },
              });
              return;
            }

            if (mockDetected && !allowMock) {
              settle({
                success: false,
                error: {
                  code: 'MOCK_DETECTED',
                  message: 'Mock location detected and rejected.',
                  userMessage:
                    'Mock GPS coordinates detected. Please turn off location spoofing in your device settings.',
                },
              });
              return;
            }

            settle({
              success: false,
              error: {
                code: 'TIMEOUT',
                message: 'GPS satellite lock timed out before acquiring position.',
                userMessage:
                  'Unable to detect your GPS position. Please check your signal and try again, or place the pin on the map.',
              },
            });
          }, effectiveTimeoutMs);
        });
      } catch (err: any) {
        console.warn('[LocationService] Unexpected acquisition error:', err?.message || err);
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: err?.message || 'Failed to acquire location.',
            userMessage: 'An unexpected error occurred while obtaining your location.',
          },
        };
      } finally {
        if (watcherSubscription) {
          (watcherSubscription as Location.LocationSubscription).remove();
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        activeFreshPositionPromises.delete(key);
      }
    })();

    activeFreshPositionPromises.set(key, acquisition);
    return acquisition;
  },

  /**
   * Backward-compatible position getter.
   * If useCacheFirst is true, attempts last known position first (e.g. for instant background map preview).
   * Otherwise, delegates to the verified high-accuracy fresh GPS engine.
   * NEVER silently returns degraded cell-tower/inaccurate coordinates.
   */
  async getCurrentPosition(options?: GetPositionOptions): Promise<Coordinates | null> {
    const {
      timeoutMs = DEFAULT_TIMEOUT_MS,
      useCacheFirst = false,
      targetAccuracyMeters = DEFAULT_TARGET_ACCURACY_METERS,
      maxAcceptableAccuracyMeters = DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS,
      maxAgeMs = DEFAULT_MAX_AGE_MS,
      allowMock = false,
    } = options || {};

    if (activeLegacyPositionPromise && useCacheFirst) {
      return activeLegacyPositionPromise;
    }

    const legacyPromise = (async (): Promise<Coordinates | null> => {
      // If cached location explicitly allowed, try last known position first
      if (useCacheFirst) {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 60000, // 1 minute max age
            requiredAccuracy: maxAcceptableAccuracyMeters,
          });
          if (
            lastKnown?.coords &&
            typeof lastKnown.coords.latitude === 'number' &&
            typeof lastKnown.coords.longitude === 'number' &&
            (allowMock || !lastKnown.mocked)
          ) {
            return {
              lat: lastKnown.coords.latitude,
              lng: lastKnown.coords.longitude,
            };
          }
        } catch {
          // Continue to fresh GPS lock
        }
      }

      const freshResult = await this.acquireFreshGPSPosition({
        timeoutMs,
        targetAccuracyMeters,
        maxAcceptableAccuracyMeters,
        maxAgeMs,
        allowMock,
      });

      if (freshResult.success) {
        return {
          lat: freshResult.location.lat,
          lng: freshResult.location.lng,
        };
      }

      // Deliberately NO fallback to the persisted last-location cache: it can be days old and
      // callers treat this method's result as a live GPS fix.
      return null;
    })();

    activeLegacyPositionPromise = legacyPromise;
    try {
      return await legacyPromise;
    } finally {
      activeLegacyPositionPromise = null;
    }
  },

  /**
   * Reverse geocodes coordinates to a human-readable city & address line.
   */
  async reverseGeocode(coords: Coordinates): Promise<GeocodedAddressResult> {
    // Delegates to the shared resolver. Unknown parts are '' — never invented.
    const res = await resolveAddress(coords.lat, coords.lng);
    const resolved = isResolvedAddress(res);
    return {
      cityName: resolved ? res.city || '' : '',
      addressLine: resolved ? res.address_line : '',
      country: resolved ? res.country || '' : '',
      formattedAddress: res.formatted_address,
      resolved,
    };
  },

  /**
   * Google Maps key for the native Maps SDK only (config / env). Web-service calls go through the
   * backend geo proxy; see services/maps/geoProxy.ts.
   */
  getGoogleMapsApiKey(): string {
    const configKey = Constants.expoConfig?.extra?.googleMapsKey;
    const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY;
    return configKey || envKey || '';
  },
};
