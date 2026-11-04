import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import {
  Coordinates,
  VerifiedLocation,
  FreshLocationOptions,
  FreshLocationResult,
} from '../../types/location.types';
import { resolveAddress, isResolvedAddress } from '../maps/addressResolver';
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

// Global in-flight lock to deduplicate concurrent hardware GPS requests
let activeFreshPositionPromise: Promise<FreshLocationResult> | null = null;
let activeLegacyPositionPromise: Promise<Coordinates | null> | null = null;

// Default thresholds for Uber-grade GPS convergence
const DEFAULT_TARGET_ACCURACY_METERS = 20; // 20m target for high-confidence lock
const DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS = 35; // 35m cutoff
const DEFAULT_TIMEOUT_MS = 9000; // 9s timeout for satellite lock
const DEFAULT_MAX_AGE_MS = 10000; // 10s freshness guard

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
   * Production-grade, high-confidence GPS position acquisition engine:
   * 1. Request deduplication (single in-flight hardware lock)
   * 2. Permission & hardware provider validation
   * 3. Android High-Accuracy dialog integration
   * 4. Multi-sample GPS warm-up & convergence via watchPositionAsync
   * 5. Strict accuracy radius validation (target <= 20m, cutoff <= 35m)
   * 6. Timestamp freshness validation (rejects stale provider fixes)
   * 7. Mock location detection & rejection
   * 8. Zero battery waste with guaranteed subscription cleanup
   * 9. Never silently falls back to inaccurate or cached positions
   */
  async acquireFreshGPSPosition(options?: FreshLocationOptions): Promise<FreshLocationResult> {
    // If a request is already in-flight, return the existing promise to prevent duplicate hardware locks
    if (activeFreshPositionPromise) {
      return activeFreshPositionPromise;
    }

    const {
      timeoutMs = DEFAULT_TIMEOUT_MS,
      targetAccuracyMeters = DEFAULT_TARGET_ACCURACY_METERS,
      maxAcceptableAccuracyMeters = DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS,
      maxAgeMs = DEFAULT_MAX_AGE_MS,
      allowMock = false,
      mayShowUserSettingsDialog = true,
    } = options || {};

    const acquisition = (async (): Promise<FreshLocationResult> => {
      let watcherSubscription: Location.LocationSubscription | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

      try {
        // Step 1: Validate permissions & hardware providers
        const state = await this.checkLocationState();

        if (!state.servicesEnabled) {
          // On Android, prompt the user with the Google Play Services high accuracy dialog
          if (Platform.OS === 'android' && mayShowUserSettingsDialog) {
            try {
              await Location.enableNetworkProviderAsync();
              const recheck = await Location.hasServicesEnabledAsync().catch(() => false);
              if (!recheck) {
                return {
                  success: false,
                  error: {
                    code: 'SERVICES_DISABLED',
                    message: 'Location services are disabled on this device.',
                    userMessage:
                      'Device location services (GPS) are turned off. Please enable GPS in your device settings.',
                  },
                };
              }
            } catch {
              return {
                success: false,
                error: {
                  code: 'SERVICES_DISABLED',
                  message: 'Location services are disabled on this device.',
                  userMessage:
                    'Device location services (GPS) are turned off. Please enable GPS in your device settings.',
                },
              };
            }
          } else {
            return {
              success: false,
              error: {
                code: 'SERVICES_DISABLED',
                message: 'Location services are disabled on this device.',
                userMessage:
                  'Device location services (GPS) are turned off. Please enable GPS in your device settings.',
              },
            };
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

        // Step 2: Progressive GPS convergence acquisition
        return await new Promise<FreshLocationResult>((resolve) => {
          let hasSettled = false;
          let bestSample: VerifiedLocation | null = null;
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

          const evaluateSample = (loc: Location.LocationObject) => {
            if (hasSettled || !loc || !loc.coords) return;

            const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } =
              loc.coords;

            // Reject invalid numerical coordinates
            if (
              typeof latitude !== 'number' ||
              isNaN(latitude) ||
              typeof longitude !== 'number' ||
              isNaN(longitude)
            ) {
              return;
            }

            // Reject invalid or negative accuracy
            if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0) {
              return;
            }

            // Mock location rejection
            if (loc.mocked) {
              mockDetected = true;
              if (!allowMock) {
                return;
              }
            }

            // Freshness validation (reject old cached fixes delivered by the OS provider)
            const sampleTime = loc.timestamp || Date.now();
            const ageMs = Date.now() - sampleTime;
            if (ageMs > maxAgeMs) {
              return;
            }

            const candidate: VerifiedLocation = {
              lat: latitude,
              lng: longitude,
              accuracy: Math.round(accuracy * 10) / 10,
              timestamp: sampleTime,
              altitude: altitude ?? null,
              altitudeAccuracy: altitudeAccuracy ?? null,
              heading: heading ?? null,
              speed: speed ?? null,
              isMocked: loc.mocked ?? false,
            };

            // Keep track of the best sample seen so far
            if (!bestSample || candidate.accuracy < bestSample.accuracy) {
              bestSample = candidate;
            }

            // Immediate resolution if target high-confidence threshold reached
            if (candidate.accuracy <= targetAccuracyMeters) {
              hasSettled = true;
              cleanup();

              // Cache verified location for warm app starts
              localStorage.cacheLastLocation({
                latitude: candidate.lat,
                longitude: candidate.lng,
              });

              resolve({
                success: true,
                location: candidate,
              });
            }
          };

          // Step 3: Start hardware satellite watcher
          const accuracyMode =
            Platform.OS === 'ios'
              ? Location.Accuracy.BestForNavigation
              : Location.Accuracy.Highest;

          Location.watchPositionAsync(
            {
              accuracy: accuracyMode,
              timeInterval: 500,
              distanceInterval: 0,
              mayShowUserSettingsDialog: true,
            },
            (location) => {
              evaluateSample(location);
            }
          )
            .then((subscription) => {
              if (hasSettled) {
                subscription.remove();
              } else {
                watcherSubscription = subscription;
              }
            })
            .catch((err) => {
              console.warn('[LocationService] watchPositionAsync error:', err);
            });

          // Step 4: Parallel one-shot racer in case watchPositionAsync is delayed
          Location.getCurrentPositionAsync({
            accuracy: accuracyMode,
          })
            .then((oneShot) => {
              evaluateSample(oneShot);
            })
            .catch(() => {
              // Ignore one-shot failure; watcher continues
            });

          // Step 5: Timeout safety timer
          timeoutTimer = setTimeout(() => {
            if (hasSettled) return;
            hasSettled = true;
            cleanup();

            // If we found a sample within acceptable cutoff threshold, accept it
            if (bestSample && bestSample.accuracy <= maxAcceptableAccuracyMeters) {
              localStorage.cacheLastLocation({
                latitude: bestSample.lat,
                longitude: bestSample.lng,
              });
              resolve({
                success: true,
                location: bestSample,
              });
              return;
            }

            // If a fix was received but accuracy was worse than acceptable cutoff
            if (bestSample) {
              resolve({
                success: false,
                error: {
                  code: 'LOW_ACCURACY',
                  message: `GPS accuracy radius of ${Math.round(bestSample.accuracy)}m exceeds acceptable threshold (${maxAcceptableAccuracyMeters}m).`,
                  userMessage: `Weak GPS signal (accuracy ±${Math.round(bestSample.accuracy)}m). Please move near a window or outdoors and try again.`,
                  accuracy: bestSample.accuracy,
                },
              });
              return;
            }

            // If mock was detected and all samples were rejected
            if (mockDetected && !allowMock) {
              resolve({
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

            // Outright timeout with zero fixes
            resolve({
              success: false,
              error: {
                code: 'TIMEOUT',
                message: 'GPS satellite lock timed out before acquiring position.',
                userMessage:
                  'Unable to detect your GPS position. Please check your signal and try again.',
              },
            });
          }, timeoutMs);
        });
      } catch (err: any) {
        console.warn('[LocationService] Unexpected acquisition error:', err);
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
        activeFreshPositionPromise = null;
      }
    })();

    activeFreshPositionPromise = acquisition;
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
      useCacheFirst = false, // Changed default to FALSE to ensure fresh data on location requests
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
            typeof lastKnown.coords.longitude === 'number'
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

      // Fresh acquisition
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
    // Delegates to the shared Google + OpenStreetMap resolver. Unknown parts are '' — never invented.
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
   * Helper to retrieve Google Maps API key from expo-constants or env
   */
  getGoogleMapsApiKey(): string {
    const configKey = Constants.expoConfig?.extra?.googleMapsKey;
    const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY;
    return configKey || envKey || '';
  },
};
