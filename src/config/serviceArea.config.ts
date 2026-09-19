import { MapRegion } from '../types/address.types';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ServiceCity {
  id: string;
  name: string;
  displayName: string;
  center: GeoPoint;
  defaultRegion: MapRegion;
  boundingBox: BoundingBox;
  polygon: GeoPoint[];
  isActive: boolean;
}

export interface ServiceAreaValidationResult {
  isServiceable: boolean;
  city: ServiceCity | null;
  cityName: string;
  errorMessage: string | null;
}

/**
 * Standard user-facing message required when an address or GPS coordinate
 * falls outside the supported operating area.
 */
export const SERVICE_UNAVAILABLE_MESSAGE =
  'This service is currently available only in Faisalabad.';

/**
 * Faisalabad City Center & Default Region Configuration
 */
export const FAISALABAD_CENTER: GeoPoint = {
  lat: 31.4187,
  lng: 73.0791,
};

export const FAISALABAD_DEFAULT_REGION: MapRegion = {
  latitude: FAISALABAD_CENTER.lat,
  longitude: FAISALABAD_CENTER.lng,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

/**
 * Greater Faisalabad Metropolitan Geofence Boundary Polygon
 *
 * Encompasses the entire Faisalabad metropolitan and industrial perimeter:
 * - Clock Tower & Inner 8 Bazaars
 * - D-Ground, Peoples Colony 1 & 2, Batala Colony, Gulberg, Samanabad
 * - Madina Town, Susan Road, Kohinoor City, Jaranwala Road
 * - Ghulam Muhammad Abad, Narwala Road, Jhang Road
 * - Millat Town, Sargodha Road & Motorway M-4 Interchange
 * - Gutwala, Canal Expressway, Khurrianwala, FIEDMC / M-3 Industrial City
 * - Faisalabad International Airport (LYP)
 * - Samundri Road, Dijkot Road, and Satiana Road urban corridors
 */
export const FAISALABAD_POLYGON: GeoPoint[] = [
  { lat: 31.5900, lng: 73.0500 }, // North: Sargodha Road / M-4 Interchange
  { lat: 31.5900, lng: 73.1500 }, // North-Northeast: North of Chak Jhumra
  { lat: 31.5600, lng: 73.2500 }, // Northeast: Sahianwala / FIEDMC North
  { lat: 31.5200, lng: 73.3200 }, // East-Northeast: Khurrianwala East
  { lat: 31.4500, lng: 73.3000 }, // East: Jaranwala Road outer
  { lat: 31.3800, lng: 73.2500 }, // East-Southeast: Satiana Road outer
  { lat: 31.3000, lng: 73.1800 }, // Southeast: Lower Satiana / Samundri Road link
  { lat: 31.2600, lng: 73.1000 }, // South: Samundri Road Bypass
  { lat: 31.2600, lng: 73.0200 }, // South-Southwest: Dijkot Road outer
  { lat: 31.3200, lng: 72.9400 }, // Southwest: Faisalabad Airport / Jhang Road
  { lat: 31.4000, lng: 72.9200 }, // West-Southwest: Jhang Road outer
  { lat: 31.4800, lng: 72.9400 }, // West: Narwala Road outer
  { lat: 31.5400, lng: 72.9800 }, // Northwest: Aminpur Road outer
];

export const FAISALABAD_BOUNDING_BOX: BoundingBox = {
  minLat: 31.24,
  maxLat: 31.61,
  minLng: 72.90,
  maxLng: 73.34,
};

export const FAISALABAD_CITY: ServiceCity = {
  id: 'faisalabad',
  name: 'Faisalabad',
  displayName: 'Faisalabad, Pakistan',
  center: FAISALABAD_CENTER,
  defaultRegion: FAISALABAD_DEFAULT_REGION,
  boundingBox: FAISALABAD_BOUNDING_BOX,
  polygon: FAISALABAD_POLYGON,
  isActive: true,
};

/**
 * Registry of all service cities. Additional cities (Lahore, Islamabad, etc.)
 * can be added here in the future with their respective boundaries.
 */
export const SERVICE_CITIES: ServiceCity[] = [FAISALABAD_CITY];

export const DEFAULT_SERVICE_CITY = FAISALABAD_CITY;

/**
 * Fast O(1) Bounding Box check.
 */
export function isPointInBoundingBox(point: GeoPoint, box: BoundingBox): boolean {
  return (
    point.lat >= box.minLat &&
    point.lat <= box.maxLat &&
    point.lng >= box.minLng &&
    point.lng <= box.maxLng
  );
}

/**
 * Point-in-Polygon (Ray Casting Algorithm / Jordan Curve Theorem)
 * Pre-filtered with bounding box for maximum performance.
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;

  const x = point.lat;
  const y = point.lng;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pI = polygon[i];
    const pJ = polygon[j];
    if (!pI || !pJ) continue;

    const xi = pI.lat;
    const yi = pI.lng;
    const xj = pJ.lat;
    const yj = pJ.lng;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if coordinates fall inside an active service city.
 */
export function findServiceCityForLocation(
  coords: GeoPoint | null | undefined
): ServiceCity | null {
  if (!coords) return null;
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  const point: GeoPoint = { lat, lng };

  for (const city of SERVICE_CITIES) {
    if (!city.isActive) continue;

    // 1. O(1) Bounding box pre-filter
    if (!isPointInBoundingBox(point, city.boundingBox)) {
      continue;
    }

    // 2. High-precision Ray Casting algorithm against city boundary polygon
    if (isPointInPolygon(point, city.polygon)) {
      return city;
    }
  }

  return null;
}

/**
 * Validate given coordinates against active service cities.
 * Always returns a structured validation result and the exact required error message if outside.
 */
export function validateServiceArea(
  coords: GeoPoint | null | undefined
): ServiceAreaValidationResult {
  const city = findServiceCityForLocation(coords);

  if (city) {
    return {
      isServiceable: true,
      city,
      cityName: city.name,
      errorMessage: null,
    };
  }

  return {
    isServiceable: false,
    city: null,
    cityName: '',
    errorMessage: SERVICE_UNAVAILABLE_MESSAGE,
  };
}

/**
 * Quick boolean check whether coordinates are in a serviceable area.
 */
export function isLocationInServiceArea(coords: GeoPoint | null | undefined): boolean {
  return validateServiceArea(coords).isServiceable;
}
