import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  autocompletePlaces,
  getPlaceDetails,
  generatePlacesSessionToken,
} from '../services/maps/places.service';
import { geocodingService } from '../services/maps/geocoding.service';
import { PlacePrediction, PlaceDetails } from '../types/address.types';
import { useLocationStore } from '../store/location.store';
import { createRequestGate } from '../utils/requestGate';

export function usePlacesAutocomplete(debounceMs: number = 350) {
  const [query, setQuery] = useState<string>('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const sessionTokenRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest-request-wins: a slow response for "gul" must never overwrite the results for "gulberg".
  const searchGateRef = useRef(createRequestGate());
  const selectGateRef = useRef(createRequestGate());
  const abortRef = useRef<AbortController | null>(null);

  const recentSearches = useLocationStore((s) => s.recentSearches);
  const addRecentSearch = useLocationStore((s) => s.addRecentSearch);
  const clearRecentSearches = useLocationStore((s) => s.clearRecentSearches);

  // Initialize session token when user begins typing
  const getOrCreateSessionToken = useCallback((): string => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generatePlacesSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const discardSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  const search = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      abortRef.current?.abort();
      if (trimmed.length < 2) {
        searchGateRef.current.invalidate();
        setPredictions([]);
        setIsLoading(false);
        return;
      }

      const ticket = searchGateRef.current.next();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setIsError(false);

      try {
        const token = getOrCreateSessionToken();
        const results = await autocompletePlaces(trimmed, token, controller.signal);
        if (!searchGateRef.current.isLatest(ticket)) return;
        setPredictions(results);
      } catch (_err) {
        if (!searchGateRef.current.isLatest(ticket)) return; // superseded / aborted: not an error
        setIsError(true);
        setPredictions([]);
      } finally {
        if (searchGateRef.current.isLatest(ticket)) setIsLoading(false);
      }
    },
    [getOrCreateSessionToken]
  );

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (text.trim().length < 2) {
        abortRef.current?.abort();
        searchGateRef.current.invalidate();
        setPredictions([]);
        setIsLoading(false);
        return;
      }

      // Show the spinner immediately; otherwise the old list looks current during the debounce
      setIsLoading(true);
      timerRef.current = setTimeout(() => {
        search(text);
      }, debounceMs);
    },
    [debounceMs, search]
  );

  const selectPlace = useCallback(
    async (prediction: PlacePrediction): Promise<PlaceDetails | null> => {
      // A pick supersedes any pending/in-flight search and any earlier pick.
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      searchGateRef.current.invalidate();
      const ticket = selectGateRef.current.next();
      setIsLoading(true);
      try {
        const token = sessionTokenRef.current || undefined;
        let details = await getPlaceDetails(prediction.place_id, token);

        // Fallback forward geocode if details API returned null
        if (!details && prediction.description) {
          try {
            const localizedQuery = prediction.description.toLowerCase().includes('faisalabad')
              ? prediction.description
              : `${prediction.description}, Faisalabad, Pakistan`;
            let geoResults = await Location.geocodeAsync(localizedQuery);
            if (!geoResults || geoResults.length === 0) {
              geoResults = await Location.geocodeAsync(prediction.description);
            }
            if (geoResults && geoResults.length > 0) {
              const first = geoResults[0];
              const reverseInfo = await geocodingService.reverseGeocode(first.latitude, first.longitude);
              details = {
                place_id: prediction.place_id,
                description: prediction.description,
                formatted_address: reverseInfo?.formatted_address || prediction.description,
                lat: first.latitude,
                lng: first.longitude,
                city: reverseInfo?.city || '',
                country: reverseInfo?.country || 'Pakistan',
              };
            }
          } catch (_e) {}
        }

        // A newer pick finished first / started after this one: drop this result
        if (!selectGateRef.current.isLatest(ticket)) return null;

        // Add to recent searches cache
        addRecentSearch(prediction);

        // End session token cycle upon final selection
        discardSessionToken();

        return details;
      } catch (_e) {
        return null;
      } finally {
        if (selectGateRef.current.isLatest(ticket)) setIsLoading(false);
      }
    },
    [addRecentSearch, discardSessionToken]
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    searchGateRef.current.invalidate();
    setQuery('');
    setPredictions([]);
    setIsLoading(false);
    discardSessionToken();
  }, [discardSessionToken]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    predictions,
    isLoading,
    isError,
    recentSearches,
    selectPlace,
    clearRecentSearches,
    reset,
  };
}
