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

/**
 * Format distance according to Uber / Zomato production standards:
 * - < 1,000 meters: "X m" (e.g. "450 m")
 * - >= 1,000 meters: "X.X km" (e.g. "1.2 km", "14.8 km")
 * - If unknown/unresolved: returns fallback (default 'Nearby')
 */
export function formatDistance(
  meters: number | null | undefined,
  fallback = 'Nearby'
): string {
  if (meters === null || meters === undefined || isNaN(meters) || meters <= 0) {
    return fallback;
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * High-precision distance resolver between a customer and a worker.
 * Checks PostGIS distance first, then falls back to client-side geodesic Haversine
 * if worker and customer coordinates are present.
 */
export function resolveWorkerDistance(
  worker: {
    distanceMeters?: number | null | undefined;
    distanceLabel?: string | null | undefined;
    lat?: number | null | undefined;
    lng?: number | null | undefined;
  },
  customerCoords?: { lat: number; lng: number } | null | undefined
): { distanceMeters: number | null; distanceLabel: string } {
  // 1. Direct PostGIS distance from backend
  if (typeof worker.distanceMeters === 'number' && worker.distanceMeters > 0) {
    return {
      distanceMeters: worker.distanceMeters,
      distanceLabel: formatDistance(worker.distanceMeters),
    };
  }

  // 2. Client-side geodesic calculation if coordinates are present
  if (
    customerCoords &&
    typeof customerCoords.lat === 'number' &&
    typeof customerCoords.lng === 'number' &&
    !isNaN(customerCoords.lat) &&
    !isNaN(customerCoords.lng) &&
    typeof worker.lat === 'number' &&
    typeof worker.lng === 'number' &&
    !isNaN(worker.lat) &&
    !isNaN(worker.lng) &&
    worker.lat !== 0 &&
    worker.lng !== 0
  ) {
    const computedMeters = Math.round(
      calculateDistanceMeters(
        customerCoords.lat,
        customerCoords.lng,
        worker.lat,
        worker.lng
      )
    );
    return {
      distanceMeters: computedMeters,
      distanceLabel: formatDistance(computedMeters),
    };
  }

  // 3. Use pre-formatted label if valid and not "0.0 km"
  if (
    worker.distanceLabel &&
    worker.distanceLabel !== '0.0 km' &&
    worker.distanceLabel !== '0 km'
  ) {
    return {
      distanceMeters: null,
      distanceLabel: worker.distanceLabel,
    };
  }

  return {
    distanceMeters: null,
    distanceLabel: 'Nearby',
  };
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
