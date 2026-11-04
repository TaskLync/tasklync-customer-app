import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { ReverseGeocodeResult } from '../../types/address.types';
import { parseGoogleReverseGeocode } from '../../utils/geocodeParse';

const GEOCODE_TIMEOUT_MS = 8000;

/**
 * Reverse geocoding: Google Geocoding API first, native platform geocoder second.
 * Never defaults to a specific city and never invents missing components — an unknown city is ''.
 * If the caller aborts (`signal`), the promise rejects with an AbortError so stale work is dropped.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const safeLat = typeof lat === 'number' && !isNaN(lat) ? lat : 0;
  const safeLng = typeof lng === 'number' && !isNaN(lng) ? lng : 0;
  const fallbackCoords = `${safeLat.toFixed(5)}, ${safeLng.toFixed(5)}`;

  const apiKey =
    Constants.expoConfig?.extra?.googleMapsKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    '';

  // 1. Google Maps Geocoding API (bounded by a timeout so a stalled connection can't hang the sheet)
  if (apiKey && apiKey !== 'your_key_here') {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const res = await fetch(url, { signal: controller.signal });
      const parsed = parseGoogleReverseGeocode(await res.json(), lat, lng);
      if (parsed) return parsed;
    } catch (_e) {
      if (signal?.aborted) throw _e;
      // timeout / network error → fall through to the native geocoder
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  if (signal?.aborted) throw abortError();

  try {
    // 2. Native platform geocoder (Apple CLGeocoder / Android Geocoder)
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });

    if (results && results.length > 0) {
      const item = results[0]!;
      const addressParts: string[] = [];

      if (item.name && item.name !== item.street) {
        addressParts.push(item.name);
      }
      if (item.streetNumber || item.street) {
        const streetFull = [item.streetNumber, item.street].filter(Boolean).join(' ');
        if (streetFull && !addressParts.includes(streetFull)) {
          addressParts.push(streetFull);
        }
      }
      if (item.district && !addressParts.includes(item.district)) {
        addressParts.push(item.district);
      }
      if (item.subregion && !addressParts.includes(item.subregion)) {
        addressParts.push(item.subregion);
      }

      const detectedCity = item.city?.trim() || item.district?.trim() || item.subregion?.trim() || '';
      const country = item.country || '';
      const addressLine = addressParts.length > 0 ? addressParts.join(', ') : detectedCity;

      if (addressLine) {
        return {
          formatted_address: [addressLine, detectedCity, country].filter(Boolean).join(', '),
          address_line: addressLine,
          city: detectedCity,
          country,
          lat,
          lng,
        };
      }
    }
  } catch (_e) {
    // Native geocoding failed or not permitted, proceed to the coordinates fallback
  }

  if (signal?.aborted) throw abortError();

  // 3. Honest coordinates fallback: real coordinates, no invented city.
  return {
    formatted_address: `Pin Location (${fallbackCoords})`,
    address_line: `Location (${fallbackCoords})`,
    city: '',
    country: '',
    lat,
    lng,
  };
}

export const geocodingService = {
  reverseGeocode,
};

function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}
