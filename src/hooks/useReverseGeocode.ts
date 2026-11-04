import { useState, useRef, useCallback, useEffect } from 'react';
import { reverseGeocode } from '../services/maps/geocoding.service';
import { ReverseGeocodeResult, GeoPoint } from '../types/address.types';
import { calculateDistanceMeters } from '../utils/address';
import { createRequestGate } from '../utils/requestGate';

interface UseReverseGeocodeOptions {
  debounceMs?: number;
  initialCoords?: GeoPoint | null;
}

const SAME_SPOT_METERS = 2;

/**
 * Coordinates → address for the map pin.
 *
 * Guarantees:
 *  - `result` always belongs to the LAST requested coordinates (older responses are discarded).
 *  - `isLoading` is true from the moment the pin moves (debounce window included), so the UI never
 *    shows the previous spot's address next to the new pin as if it were current.
 *  - On failure `result` is cleared (never a fabricated address) and `errorMessage` is set.
 */
export function useReverseGeocode(options?: UseReverseGeocodeOptions) {
  const debounceMs = options?.debounceMs ?? 500;
  const initialCoords = options?.initialCoords;

  const [result, setResultState] = useState<ReverseGeocodeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const gateRef = useRef(createRequestGate());
  // Coordinates the CURRENT `result` describes (null while unknown / failed)
  const resolvedCoordsRef = useRef<GeoPoint | null>(null);

  const isValid = (lat: number, lng: number) =>
    typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);

  const isSameSpot = (lat: number, lng: number) =>
    resolvedCoordsRef.current !== null &&
    calculateDistanceMeters(resolvedCoordsRef.current.lat, resolvedCoordsRef.current.lng, lat, lng) <
      SAME_SPOT_METERS;

  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const fetchGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (!isValid(lat, lng)) return;
      if (isSameSpot(lat, lng)) {
        setIsLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const ticket = gateRef.current.next();

      setIsLoading(true);
      setIsError(false);
      setErrorMessage(null);

      try {
        const res = await reverseGeocode(lat, lng, controller.signal);
        if (!gateRef.current.isLatest(ticket)) return;
        resolvedCoordsRef.current = { lat, lng };
        setResultState(res);
      } catch (err: any) {
        if (!gateRef.current.isLatest(ticket)) return;
        resolvedCoordsRef.current = null;
        setResultState(null);
        setIsError(true);
        setErrorMessage(err?.message || "Couldn't determine address — try adjusting the pin");
      } finally {
        if (gateRef.current.isLatest(ticket)) setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const triggerGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!isValid(lat, lng)) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      // Pin landed on the spot we already have an address for → nothing to do
      if (isSameSpot(lat, lng)) {
        abortRef.current?.abort();
        gateRef.current.invalidate();
        setIsLoading(false);
        return;
      }

      // The pin moved: whatever is in `result` is now stale. Invalidate in-flight work and show
      // loading right away instead of leaving the old address under the new pin for the debounce.
      abortRef.current?.abort();
      gateRef.current.invalidate();
      setIsLoading(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fetchGeocode(lat, lng);
      }, debounceMs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounceMs, fetchGeocode]
  );

  /**
   * Manually provide the address for a spot (e.g. a Places selection or an existing saved address).
   * Cancels any pending/in-flight lookup so it cannot overwrite this value afterwards.
   */
  const setResult = useCallback(
    (res: ReverseGeocodeResult | null) => {
      cancelPending();
      gateRef.current.invalidate();
      resolvedCoordsRef.current = res ? { lat: res.lat, lng: res.lng } : null;
      setIsError(false);
      setErrorMessage(null);
      setIsLoading(false);
      setResultState(res);
    },
    [cancelPending]
  );

  useEffect(() => {
    if (initialCoords) {
      fetchGeocode(initialCoords.lat, initialCoords.lng);
    }
    return cancelPending;
  }, [initialCoords, fetchGeocode, cancelPending]);

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
