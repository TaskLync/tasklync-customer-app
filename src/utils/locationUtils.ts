/**
 * Utility functions for geographic coordinates and distance calculations.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the distance in meters between two geographic coordinates using the Haversine formula.
 */
export function getDistanceMeters(
  coords1: Coordinates,
  coords2: Coordinates
): number {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (coords1.lat * Math.PI) / 180;
  const radLat2 = (coords2.lat * Math.PI) / 180;
  const deltaLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const deltaLng = ((coords2.lng - coords1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate the distance in meters between two lat/lng pairs using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return getDistanceMeters({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}

/** True for finite, in-range, non-(0,0) coordinates. */
export function isValidCoordinate(
  c?: { lat?: number | null | undefined; lng?: number | null | undefined } | null
): c is Coordinates {
  return (
    !!c &&
    typeof c.lat === 'number' &&
    typeof c.lng === 'number' &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    Math.abs(c.lat) <= 90 &&
    Math.abs(c.lng) <= 180 &&
    !(c.lat === 0 && c.lng === 0)
  );
}

/**
 * Format distance:
 * - < 1,000 m: whole metres ("55 m", "200 m")
 * - >= 1,000 m: one decimal km ("1.2 km", "5.3 km")
 * - unknown/invalid: returns `fallback` (default: empty string, i.e. show nothing)
 */
export function formatDistance(
  meters: number | null | undefined,
  fallback = ''
): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters <= 0) {
    return fallback;
  }
  const whole = Math.round(meters);
  if (whole < 1000) {
    return `${whole} m`;
  }
  return `${(whole / 1000).toFixed(1)} km`;
}

// ── Worker coordinate snapshots ──────────────────────────────────────────────
// Some endpoints (search) omit worker coordinates, others (/workers/nearby) include them. Remember
// coordinates seen in ANY response for a short time so the same worker resolves to the same
// distance everywhere. Entries expire so a moved worker is never measured from an old position.
const WORKER_COORD_TTL_MS = 10 * 60 * 1000;
const workerCoordSnapshots = new Map<string, { lat: number; lng: number; at: number }>();

let snapshotVersion = 0;
const snapshotListeners = new Set<() => void>();

/** Subscribe to snapshot changes (used by useWorkerCoordsVersion so rendered labels re-resolve). */
export function subscribeWorkerCoords(listener: () => void): () => void {
  snapshotListeners.add(listener);
  return () => {
    snapshotListeners.delete(listener);
  };
}
export const getWorkerCoordsVersion = (): number => snapshotVersion;

/**
 * Record the live coordinates of workers from the location-owning endpoint (/workers/nearby).
 * The version only bumps when a coordinate actually changed, so unchanged refetches cause no re-render.
 */
export function rememberWorkerCoords(worker: {
  id?: string | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
}): void {
  const coords = { lat: worker.lat, lng: worker.lng };
  if (worker.id && isValidCoordinate(coords)) {
    const prev = workerCoordSnapshots.get(worker.id);
    workerCoordSnapshots.set(worker.id, { lat: coords.lat, lng: coords.lng, at: Date.now() });
    if (!prev || prev.lat !== coords.lat || prev.lng !== coords.lng) {
      snapshotVersion += 1;
      snapshotListeners.forEach((l) => l());
    }
  }
}

function recallWorkerCoords(id?: string): Coordinates | null {
  if (!id) return null;
  const hit = workerCoordSnapshots.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > WORKER_COORD_TTL_MS) {
    workerCoordSnapshots.delete(id);
    return null;
  }
  return { lat: hit.lat, lng: hit.lng };
}

/**
 * Single distance resolver used by every worker list.
 * 1. Haversine between the customer's exact coordinates and the worker's coordinates
 *    (from the response, or a recent snapshot from another response).
 * 2. Otherwise the backend's own distance (already measured from the request coordinates).
 * 3. Otherwise unknown: { distanceMeters: null, distanceLabel: '' } — never a made-up value.
 */
export function resolveWorkerDistance(
  worker: {
    id?: string | undefined;
    distanceMeters?: number | null | undefined;
    lat?: number | null | undefined;
    lng?: number | null | undefined;
  },
  customerCoords?: { lat: number; lng: number } | null | undefined
): { distanceMeters: number | null; distanceLabel: string } {
  if (isValidCoordinate(customerCoords)) {
    // The live snapshot (worker-service /nearby) wins over coordinates embedded in other responses
    // (e.g. a possibly stale search index), so every list measures to the same point.
    const ownCoords = { lat: worker.lat, lng: worker.lng };
    const workerCoords = recallWorkerCoords(worker.id) ?? (isValidCoordinate(ownCoords) ? ownCoords : null);
    if (workerCoords) {
      const meters = Math.round(getDistanceMeters(customerCoords, workerCoords));
      return { distanceMeters: meters, distanceLabel: formatDistance(meters) };
    }
  }

  if (
    typeof worker.distanceMeters === 'number' &&
    Number.isFinite(worker.distanceMeters) &&
    worker.distanceMeters > 0
  ) {
    return {
      distanceMeters: worker.distanceMeters,
      distanceLabel: formatDistance(worker.distanceMeters),
    };
  }

  return { distanceMeters: null, distanceLabel: '' };
}

/**
 * Dynamic location address parser to extract real city/district/area names
 * from reverse geocoded LocationGeocodedAddress objects without static fallbacks.
 */
export function extractCityOrAreaName(place?: any): string {
  if (!place || typeof place !== 'object') return 'Current Area';

  const city = place.city?.trim();
  const district = place.district?.trim();
  const subregion = place.subregion?.trim();
  const region = place.region?.trim();
  const name = place.name?.trim() || place.street?.trim();

  // 1. Municipality / city (e.g. "Toba Tek Singh", "Faisalabad")
  if (city && city.toLowerCase() !== 'punjab') {
    return city;
  }

  // 2. District level (e.g. "Toba Tek Singh District")
  if (district && district.toLowerCase() !== 'punjab') {
    return district;
  }

  // 3. Subregion / Tehsil level
  if (subregion && subregion.toLowerCase() !== 'punjab') {
    return subregion;
  }

  // 4. Locality or landmark name
  if (name && !name.toLowerCase().startsWith('unnamed')) {
    return name;
  }

  if (region) return region;

  return 'Current Area';
}

export function extractFullAddressLine(place?: any): string {
  if (!place || typeof place !== 'object') return 'Current GPS Location';

  const streetNumber = place.streetNumber?.trim();
  const street = place.street?.trim() || place.name?.trim();
  const district = place.district?.trim() || place.subregion?.trim();
  const city = place.city?.trim();

  const streetPart = streetNumber && street ? `${streetNumber} ${street}` : street;
  const parts = [streetPart, district, city].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Current GPS Location';
}

/**
 * Rounds a coordinate to 3 decimals (~110 m) for use in query keys / discovery requests, so that
 * sub-100 m GPS jitter does not trigger a new network request. Never use for booking/address data.
 */
export function roundCoordForQuery(value: number): number {
  return Math.round(value * 1000) / 1000;
}
