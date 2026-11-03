import { useRef, useState, useCallback, RefObject } from 'react';
import MapView, { Region } from 'react-native-maps';
import { Coordinates } from '../types/location.types';
import { FAISALABAD_CENTER } from '../config/serviceArea.config';

const DEFAULT_DELTA = {
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

const STREET_LEVEL_DELTA = {
  latitudeDelta: 0.007,
  longitudeDelta: 0.007,
};

// Threshold distance in degrees to determine if user panned away from home location
const PAN_THRESHOLD_DELTA = 0.005;

export interface UseMapCameraReturn {
  mapRef: RefObject<MapView | null>;
  currentRegion: Region | null;
  hasPannedAway: boolean;
  flyTo: (coords: Coordinates, shouldZoom?: boolean, duration?: number) => void;
  recenter: (
    userCoords: Coordinates | null,
    fallbackCoords?: Coordinates,
    zoomLevel?: 'street' | 'default'
  ) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  onRegionChangeComplete: (region: Region, userCoords: Coordinates | null) => void;
}

export const useMapCamera = (initialRegion?: Region): UseMapCameraReturn => {
  const mapRef = useRef<MapView | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(initialRegion || null);
  const [hasPannedAway, setHasPannedAway] = useState<boolean>(false);

  const flyTo = useCallback((coords: Coordinates, shouldZoom = true, duration = 450) => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: coords.lat,
        longitude: coords.lng,
        ...(shouldZoom
          ? STREET_LEVEL_DELTA
          : currentRegion
          ? {
              latitudeDelta: currentRegion.latitudeDelta,
              longitudeDelta: currentRegion.longitudeDelta,
            }
          : DEFAULT_DELTA),
      },
      duration
    );
  }, [currentRegion]);

  const recenter = useCallback(
    (
      userCoords: Coordinates | null,
      fallbackCoords?: Coordinates,
      zoomLevel: 'street' | 'default' = 'street'
    ) => {
      const target = userCoords || fallbackCoords || FAISALABAD_CENTER;
      if (!mapRef.current) return;
      mapRef.current.animateToRegion(
        {
          latitude: target.lat,
          longitude: target.lng,
          ...(zoomLevel === 'street' ? STREET_LEVEL_DELTA : DEFAULT_DELTA),
        },
        450
      );
      setHasPannedAway(false);
    },
    []
  );

  const zoomIn = useCallback(() => {
    if (!mapRef.current || !currentRegion) return;
    const newRegion: Region = {
      ...currentRegion,
      latitudeDelta: Math.max(0.002, currentRegion.latitudeDelta / 1.8),
      longitudeDelta: Math.max(0.002, currentRegion.longitudeDelta / 1.8),
    };
    mapRef.current.animateToRegion(newRegion, 250);
  }, [currentRegion]);

  const zoomOut = useCallback(() => {
    if (!mapRef.current || !currentRegion) return;
    const newRegion: Region = {
      ...currentRegion,
      latitudeDelta: Math.min(0.2, currentRegion.latitudeDelta * 1.8),
      longitudeDelta: Math.min(0.2, currentRegion.longitudeDelta * 1.8),
    };
    mapRef.current.animateToRegion(newRegion, 250);
  }, [currentRegion]);

  const onRegionChangeComplete = useCallback((region: Region, userCoords: Coordinates | null) => {
    setCurrentRegion(region);

    if (userCoords) {
      const latDiff = Math.abs(region.latitude - userCoords.lat);
      const lngDiff = Math.abs(region.longitude - userCoords.lng);

      if (latDiff > PAN_THRESHOLD_DELTA || lngDiff > PAN_THRESHOLD_DELTA) {
        setHasPannedAway(true);
      } else {
        setHasPannedAway(false);
      }
    }
  }, []);

  return {
    mapRef,
    currentRegion,
    hasPannedAway,
    flyTo,
    recenter,
    zoomIn,
    zoomOut,
    onRegionChangeComplete,
  };
};
