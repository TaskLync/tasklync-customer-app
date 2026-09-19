import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  autocompletePlaces,
  getPlaceDetails,
  generatePlacesSessionToken,
} from '../services/maps/places.service';
import { PlacePrediction, PlaceDetails } from '../types/address.types';
import { useLocationStore } from '../store/location.store';

export function usePlacesAutocomplete(debounceMs: number = 350) {
  const [query, setQuery] = useState<string>('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const sessionTokenRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (trimmed.length < 2) {
        setPredictions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const token = getOrCreateSessionToken();
        const results = await autocompletePlaces(trimmed, token);
        setPredictions(results);
      } catch (_err) {
        setIsError(true);
        setPredictions([]);
      } finally {
        setIsLoading(false);
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
        setPredictions([]);
        setIsLoading(false);
        return;
      }

      timerRef.current = setTimeout(() => {
        search(text);
      }, debounceMs);
    },
    [debounceMs, search]
  );

  const selectPlace = useCallback(
    async (prediction: PlacePrediction): Promise<PlaceDetails | null> => {
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
              details = {
                place_id: prediction.place_id,
                description: prediction.description,
                formatted_address: prediction.description,
                lat: first.latitude,
                lng: first.longitude,
                city: 'Faisalabad',
                country: 'Pakistan',
              };
            }
          } catch (_e) {}
        }

        // Add to recent searches cache
        addRecentSearch(prediction);

        // End session token cycle upon final selection
        discardSessionToken();

        return details;
      } catch (_e) {
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [addRecentSearch, discardSessionToken]
  );

  const reset = useCallback(() => {
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
