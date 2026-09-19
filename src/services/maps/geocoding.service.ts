import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { ReverseGeocodeResult } from '../../types/address.types';

/**
 * High-precision reverse geocoding service
 * Combines native platform geocoder (expo-location) with Google Maps Geocoding API
 * with complete offline and coordinate fallbacks.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const fallbackCoords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  const apiKey =
    Constants.expoConfig?.extra?.googleMapsKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    '';

  // 1. Try Google Maps Geocoding API when key is configured
  if (apiKey && apiKey !== 'your_key_here') {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && Array.isArray(json.results) && json.results.length > 0) {
        const first = json.results[0];
        const formatted = first.formatted_address || fallbackCoords;
        let city = 'Faisalabad';
        let country = 'Pakistan';
        for (const comp of first.address_components || []) {
          if (comp.types.includes('locality')) city = comp.long_name;
          if (comp.types.includes('country')) country = comp.long_name;
        }
        return {
          formatted_address: formatted,
          address_line: formatted.split(',')[0] || formatted,
          city,
          country,
          lat,
          lng,
        };
      }
    } catch (_e) {
      // Fall through to native geocoder
    }
  }

  try {
    // 2. Try native platform geocoder (Apple CLGeocoder on iOS, Android Geocoder on Android)
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    if (results && results.length > 0) {
      const item = results[0];
      const addressParts: string[] = [];

      // Build structured street address
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

      const city = item.city || item.subregion || 'Faisalabad';
      const country = item.country || 'Pakistan';
      const addressLine = addressParts.length > 0 ? addressParts.join(', ') : city;
      const formattedAddress = `${addressLine}, ${city}, ${country}`;

      return {
        formatted_address: formattedAddress,
        address_line: addressLine,
        city,
        country,
        lat,
        lng,
      };
    }
  } catch (_e) {
    // Native geocoding failed or not permitted, proceed to fallback
  }

  // 2. Return high-reliability coordinates fallback (for unmapped roads/plots)
  return {
    formatted_address: `Pin Location (${fallbackCoords})`,
    address_line: `Location (${fallbackCoords})`,
    city: 'Faisalabad',
    country: 'Pakistan',
    lat,
    lng,
  };
}
