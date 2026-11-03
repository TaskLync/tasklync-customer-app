import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { ReverseGeocodeResult } from '../../types/address.types';

/**
 * High-precision reverse geocoding service
 * Combines native platform geocoder (expo-location) with Google Maps Geocoding API.
 * Never hardcodes or defaults to any specific city (e.g. Faisalabad).
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const safeLat = typeof lat === 'number' && !isNaN(lat) ? lat : 0;
  const safeLng = typeof lng === 'number' && !isNaN(lng) ? lng : 0;
  const fallbackCoords = `${safeLat.toFixed(5)}, ${safeLng.toFixed(5)}`;

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
        let city = '';
        let country = 'Pakistan';

        for (const comp of first.address_components || []) {
          if (comp.types.includes('locality')) {
            city = comp.long_name;
          } else if (!city && comp.types.includes('administrative_area_level_2')) {
            city = comp.long_name; // e.g. Toba Tek Singh District
          } else if (!city && comp.types.includes('sublocality')) {
            city = comp.long_name;
          }
          if (comp.types.includes('country')) {
            country = comp.long_name;
          }
        }

        if (!city) {
          city = 'Current Area';
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

      // Extract real city without any Faisalabad fallback
      const detectedCity =
        item.city?.trim() ||
        item.district?.trim() ||
        item.subregion?.trim() ||
        'Current Area';

      const country = item.country || 'Pakistan';
      const addressLine = addressParts.length > 0 ? addressParts.join(', ') : detectedCity;
      const formattedAddress = `${addressLine}, ${detectedCity}, ${country}`;

      return {
        formatted_address: formattedAddress,
        address_line: addressLine,
        city: detectedCity,
        country,
        lat,
        lng,
      };
    }
  } catch (_e) {
    // Native geocoding failed or not permitted, proceed to fallback
  }

  // 3. High-reliability coordinates fallback (never hardcode Faisalabad)
  return {
    formatted_address: `Pin Location (${fallbackCoords})`,
    address_line: `Location (${fallbackCoords})`,
    city: 'Current Area',
    country: 'Pakistan',
    lat,
    lng,
  };
}

export const geocodingService = {
  reverseGeocode,
};
