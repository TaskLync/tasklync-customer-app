import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { PlacePrediction, PlaceDetails } from '../../types/address.types';
import { generateUUID } from '../../utils/uuid';

/**
 * Generates a standard UUID session token for Google Places Autocomplete billing optimization
 */
export function generatePlacesSessionToken(): string {
  return generateUUID();
}

/**
 * Places Autocomplete query
 * Grounded in live Google Places API with native platform geocoder fallback. Zero demo data.
 */
export async function autocompletePlaces(
  query: string,
  sessionToken?: string
): Promise<PlacePrediction[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const apiKey =
    Constants.expoConfig?.extra?.googleMapsKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    '';

  // If live Google API Key is valid and configured
  if (apiKey && apiKey !== 'your_key_here') {
    // 1. Try Places API (New) - required for modern Google Cloud projects
    try {
      const newPlacesRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: cleanQuery,
          includedRegionCodes: ['PK'],
          locationBias: {
            circle: {
              center: {
                latitude: 31.4187,
                longitude: 73.0791,
              },
              radius: 35000.0,
            },
          },
        }),
      });
      const newPlacesJson = await newPlacesRes.json();
      if (Array.isArray(newPlacesJson.suggestions) && newPlacesJson.suggestions.length > 0) {
        return newPlacesJson.suggestions.slice(0, 5).map((s: any) => {
          const placePred = s.placePrediction;
          return {
            place_id: placePred.placeId,
            description: placePred.text?.text || '',
            primary_text: placePred.structuredFormat?.mainText?.text || placePred.text?.text || '',
            secondary_text: placePred.structuredFormat?.secondaryText?.text || '',
          };
        });
      }
    } catch (_e) {
      // Fall through to legacy
    }

    // 2. Try Places API (Legacy)
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        cleanQuery
      )}&components=country:pk&location=31.4187,73.0791&radius=35000&strictbounds=false&sessiontoken=${sessionToken || generatePlacesSessionToken()}&key=${apiKey}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status === 'OK' && Array.isArray(json.predictions)) {
        return json.predictions.slice(0, 5).map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
          primary_text: p.structured_formatting?.main_text || p.description,
          secondary_text: p.structured_formatting?.secondary_text || '',
        }));
      }
    } catch (_e) {
      // Fall through to native geocoder
    }
  }

  // Real native forward geocode with expo-location (No demo/mock landmarks)
  try {
    const localizedQuery = cleanQuery.toLowerCase().includes('faisalabad')
      ? cleanQuery
      : `${cleanQuery}, Faisalabad, Pakistan`;
    let geoResults = await Location.geocodeAsync(localizedQuery);
    if (!geoResults || geoResults.length === 0) {
      geoResults = await Location.geocodeAsync(cleanQuery);
    }
    if (geoResults && geoResults.length > 0) {
      const topResults = geoResults.slice(0, 5);
      return topResults.map((r, index) => ({
        place_id: `geo_${r.latitude}_${r.longitude}_${index}`,
        description: cleanQuery,
        primary_text: cleanQuery,
        secondary_text: `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)} • Faisalabad`,
      }));
    }
  } catch (_e) {}

  return [];
}

/**
 * Fetch Place Details by place_id
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetails | null> {
  const apiKey =
    Constants.expoConfig?.extra?.googleMapsKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    '';

  // Check geocoded ID pattern
  if (placeId.startsWith('geo_')) {
    const parts = placeId.split('_');
    const lat = parseFloat(parts[1]);
    const lng = parseFloat(parts[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        const first = reverseResults?.[0];
        const city = first?.city || first?.subregion || 'Faisalabad';
        const country = first?.country || 'Pakistan';
        const address = [first?.name || first?.street, first?.district, city].filter(Boolean).join(', ');

        return {
          place_id: placeId,
          description: address || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          formatted_address: address || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          lat,
          lng,
          city,
          country,
        };
      } catch {
        return {
          place_id: placeId,
          description: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          formatted_address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          lat,
          lng,
          city: 'Faisalabad',
          country: 'Pakistan',
        };
      }
    }
  }

  // Live Google Places Details API
  if (apiKey && apiKey !== 'your_key_here') {
    // 1. Try Places API (New) details
    try {
      const newDetailsRes = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=id,displayName,formattedAddress,location,addressComponents`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
          },
        }
      );
      const newJson = await newDetailsRes.json();
      if (newJson.location && typeof newJson.location.latitude === 'number') {
        let city = 'Faisalabad';
        let country = 'Pakistan';
        for (const comp of newJson.addressComponents || []) {
          if (comp.types?.includes('locality')) city = comp.longText || comp.shortText;
          if (comp.types?.includes('country')) country = comp.longText || comp.shortText;
        }
        return {
          place_id: placeId,
          description: newJson.displayName?.text || newJson.formattedAddress || '',
          formatted_address: newJson.formattedAddress || newJson.displayName?.text || '',
          lat: newJson.location.latitude,
          lng: newJson.location.longitude,
          city,
          country,
        };
      }
    } catch (_e) {}

    // 2. Try Legacy Place Details
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=formatted_address,geometry,address_components,name&sessiontoken=${
        sessionToken || ''
      }&key=${apiKey}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status === 'OK' && json.result) {
        const result = json.result;
        const lat = result.geometry?.location?.lat || 31.4187;
        const lng = result.geometry?.location?.lng || 73.0791;
        const cityComp = result.address_components?.find((c: any) =>
          c.types.includes('locality')
        );

        return {
          place_id: placeId,
          description: result.name || result.formatted_address,
          formatted_address: result.formatted_address,
          lat,
          lng,
          city: cityComp?.long_name || 'Faisalabad',
          country: 'Pakistan',
        };
      }
    } catch (_e) {}
  }

  return null;
}
