import { Home, Building2, MapPin, LucideIcon } from 'lucide-react-native';
import { Address, ReverseGeocodeResult } from '../types/address.types';

/**
 * Maps an address label to its representative icon
 * Home -> Home icon
 * Office/Work -> Building2 icon
 * Other/Custom -> MapPin icon
 */
export function labelToIcon(label: string): LucideIcon {
  const normalized = (label || '').trim().toLowerCase();
  if (normalized.includes('home') || normalized === 'house') {
    return Home;
  }
  if (
    normalized.includes('office') ||
    normalized.includes('work') ||
    normalized.includes('business') ||
    normalized.includes('building')
  ) {
    return Building2;
  }
  return MapPin;
}

/**
 * Formats an address into a clean, display-ready single or multi-part string
 */
export function formatAddressLine(
  address: Partial<Address> | ReverseGeocodeResult | string | null | undefined
): string {
  if (!address) return 'Select a location on the map';
  if (typeof address === 'string') return address.trim();

  if ('address_line' in address && address.address_line) {
    const line = address.address_line.trim();
    if (address.city && !line.toLowerCase().includes(address.city.toLowerCase())) {
      return `${line}, ${address.city}`;
    }
    return line;
  }

  if ('formatted_address' in address && address.formatted_address) {
    return address.formatted_address.trim();
  }

  if (
    typeof address.lat === 'number' &&
    !isNaN(address.lat) &&
    typeof address.lng === 'number' &&
    !isNaN(address.lng)
  ) {
    return `${address.lat.toFixed(5)}, ${address.lng.toFixed(5)}`;
  }

  return 'Unknown Location';
}

/**
 * Calculates great-circle distance between two geographic coordinates in meters
 * using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns a human-friendly distance label (e.g. "15 m away", "1.2 km away")
 */
export function distanceLabel(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): string {
  const meters = calculateDistanceMeters(lat1, lng1, lat2, lng2);
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

/**
 * Checks if picked coordinates are within a duplicate threshold (~15m) of any existing saved address
 */
export function findNearbySavedAddress(
  coords: { lat: number; lng: number },
  existingAddresses: Address[],
  thresholdMeters: number = 15
): Address | null {
  if (!existingAddresses || existingAddresses.length === 0) return null;
  if (
    !coords ||
    typeof coords.lat !== 'number' ||
    isNaN(coords.lat) ||
    typeof coords.lng !== 'number' ||
    isNaN(coords.lng)
  ) {
    return null;
  }

  for (const addr of existingAddresses) {
    if (
      addr &&
      typeof addr.lat === 'number' &&
      !isNaN(addr.lat) &&
      typeof addr.lng === 'number' &&
      !isNaN(addr.lng)
    ) {
      const distance = calculateDistanceMeters(coords.lat, coords.lng, addr.lat, addr.lng);
      if (distance <= thresholdMeters) {
        return addr;
      }
    }
  }

  return null;
}
