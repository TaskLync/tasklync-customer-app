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
    if (
      typeof lat !== 'number' ||
      isNaN(lat) ||
      typeof lng !== 'number' ||
      isNaN(lng)
    ) {
      return;
    }

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
      const safeLatStr = typeof lat === 'number' && !isNaN(lat) ? lat.toFixed(5) : '0.00000';
      const safeLngStr = typeof lng === 'number' && !isNaN(lng) ? lng.toFixed(5) : '0.00000';
      // Fallback coordinate object so user can still proceed if in unmapped zone
      setResult({
        formatted_address: `Coordinates (${safeLatStr}, ${safeLngStr})`,
        address_line: `Location (${safeLatStr}, ${safeLngStr})`,
        city: 'Current Area',
        country: 'Pakistan',
        lat: typeof lat === 'number' && !isNaN(lat) ? lat : 0,
        lng: typeof lng === 'number' && !isNaN(lng) ? lng : 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerGeocode = useCallback(
    (lat: number, lng: number) => {
      if (
        typeof lat !== 'number' ||
        isNaN(lat) ||
        typeof lng !== 'number' ||
        isNaN(lng)
      ) {
        return;
      }
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
