export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoLocation extends Coordinates {
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface VerifiedLocation extends Coordinates {
  accuracy: number; // in meters (positive horizontal accuracy)
  timestamp: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  isMocked?: boolean;
}

export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'PERMISSION_BLOCKED' // permanently denied, canAskAgain = false
  | 'SERVICES_DISABLED' // device GPS / location provider turned off
  | 'TIMEOUT' // GPS lock timed out before acquiring adequate fix
  | 'LOW_ACCURACY' // GPS lock acquired but accuracy radius exceeds acceptable threshold
  | 'MOCK_DETECTED' // mock / spoofed location detected and rejected
  | 'HARDWARE_UNAVAILABLE'
  | 'UNKNOWN';

export interface LocationError {
  code: LocationErrorCode;
  message: string;
  userMessage: string;
  accuracy?: number | null;
  canAskAgain?: boolean;
}

export type FreshLocationResult =
  | { success: true; location: VerifiedLocation }
  | { success: false; error: LocationError };

export interface FreshLocationOptions {
  /**
   * Maximum total duration in ms to wait for GPS lock and satellite convergence.
   * Default: 9000ms.
   */
  timeoutMs?: number;

  /**
   * Desired accuracy in meters. Once an update reaches this, the acquisition resolves immediately.
   * Default: 20 meters.
   */
  targetAccuracyMeters?: number;

  /**
   * Maximum acceptable accuracy in meters.
   * If timeout arrives and best fix is within this threshold, it is accepted.
   * If best fix is worse than this threshold, it is rejected with LOW_ACCURACY error.
   * Default: 35 meters.
   */
  maxAcceptableAccuracyMeters?: number;

  /**
   * Maximum age of a GPS fix in ms. Fixes older than this are rejected as stale.
   * Default: 10000ms (10 seconds).
   */
  maxAgeMs?: number;

  /**
   * Whether to accept mocked / spoofed GPS locations.
   * Default: false (reject mock locations).
   */
  allowMock?: boolean;

  /**
   * Android only: whether to prompt user with native Google Play Services location dialog.
   * Default: true.
   */
  mayShowUserSettingsDialog?: boolean;
}

export interface NearbyWorkersParams {
  lat: number;
  lng: number;
  radius: number;
  category?: string;
  serviceId?: string;
  minRating?: number;
  maxRate?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  provider_type?: 'INDIVIDUAL' | 'COMPANY' | 'ANY';
}

