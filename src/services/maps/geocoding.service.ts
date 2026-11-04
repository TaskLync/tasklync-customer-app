import { ReverseGeocodeResult } from '../../types/address.types';
import { resolveAddress } from './addressResolver';

/**
 * Reverse geocoding facade. All logic (Google + OpenStreetMap comparison, caching, native and
 * coordinates fallback) lives in `addressResolver`; this keeps the existing import surface intact.
 * If the caller aborts (`signal`), the promise rejects with an AbortError so stale work is dropped.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  return resolveAddress(lat, lng, signal);
}

export const geocodingService = {
  reverseGeocode,
};
