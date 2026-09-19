import { useState, useRef, useCallback, useEffect } from 'react';
import { reverseGeocode } from '../services/maps/geocoding.service';
import { ReverseGeocodeResult, GeoPoint } from '../types/address.types';
import { calculateDistanceMeters } from '../utils/address';

interface UseReverseGeocodeOptions {
  debounceMs?: number;
  initialCoords?: GeoPoint | null;
}

export function useReverseGeocode(options?: UseReverseGeocodeOptions) {
  const debounceMs = options?.debounceMs ?? 500;
  const initialCoords = options?.initialCoords;

  const [result, setResult] = useState<ReverseGeocodeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedCoordsRef = useRef<GeoPoint | null>(null);

  const fetchGeocode = useCallback(async (lat: number, lng: number) => {
    // Avoid re-requesting if moved less than 2 meters
    if (lastGeocodedCoordsRef.current) {
      const dist = calculateDistanceMeters(
        lastGeocodedCoordsRef.current.lat,
        lastGeocodedCoordsRef.current.lng,
        lat,
        lng
      );
      if (dist < 2) {
        return;
      }
    }

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    try {
      const res = await reverseGeocode(lat, lng);
      setResult(res);
      lastGeocodedCoordsRef.current = { lat, lng };
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(
        err?.message || "Couldn't determine address — try adjusting the pin"
      );
      // Fallback coordinate object so user can still proceed if in unmapped zone
      setResult({
        formatted_address: `Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        address_line: `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        city: 'Faisalabad',
        country: 'Pakistan',
        lat,
        lng,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerGeocode = useCallback(
    (lat: number, lng: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        fetchGeocode(lat, lng);
      }, debounceMs);
    },
    [debounceMs, fetchGeocode]
  );

  useEffect(() => {
    if (initialCoords) {
      fetchGeocode(initialCoords.lat, initialCoords.lng);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [initialCoords, fetchGeocode]);

  return {
    result,
    formattedAddress: result?.address_line || result?.formatted_address || '',
    isLoading,
    isError,
    errorMessage,
    triggerGeocode,
    fetchImmediately: fetchGeocode,
    setResult,
  };
}
