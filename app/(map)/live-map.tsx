import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
  FAISALABAD_CENTER,
} from '../../src/config/serviceArea.config';
import { useLocation } from '../../src/hooks/useLocation';
import { useMapFilterStore } from '../../src/store/mapFilter.store';
import { useNearbyWorkers } from '../../src/hooks/useNearbyWorkers';
import { useMapCamera } from '../../src/hooks/useMapCamera';
import { useMarkerSelection } from '../../src/hooks/useMarkerSelection';
import { WorkerNearby } from '../../src/types/worker.types';
import { Coordinates } from '../../src/types/location.types';
import { getCategoryMeta } from '../../src/components/map/WorkerMarkerBadge';

import { MapCanvas } from '../../src/components/map/MapCanvas';
import { MapTopBar } from '../../src/components/map/MapTopBar';
import { MapControls } from '../../src/components/map/MapControls';
import { MapBottomPanel } from '../../src/components/map/MapBottomPanel';
import { MapPanelHeader } from '../../src/components/map/MapPanelHeader';
import { MapWorkerList } from '../../src/components/map/MapWorkerList';
import { colors, palette, fontFamily, radius, shadows } from '../../src/design';

export default function LiveMapScreen() {
  const router = useRouter();
  const {
    location: activeLocation,
    gpsLocation,
    isPermissionGranted,
    isServicesEnabled,
    requestLocation,
    refreshLocation,
    openSettings,
  } = useLocation({ autoFetch: true });
  const { selectedCategory, resetFilter } = useMapFilterStore();

  const {
    mapRef,
    hasPannedAway,
    flyTo,
    recenter,
    zoomIn,
    zoomOut,
    onRegionChangeComplete,
  } = useMapCamera();

  const { selectedId, selectWorker } = useMarkerSelection();

  // Fetch nearby workers synced with active category filter
  const { workers, isLoading } = useNearbyWorkers({
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(activeLocation?.lat !== undefined ? { lat: activeLocation.lat } : {}),
    ...(activeLocation?.lng !== undefined ? { lng: activeLocation.lng } : {}),
    radius: 5000, // 5km search radius
    limit: 20,
  });

  // Handle marker selection (pin tap -> fly to pin & select card)
  const handleSelectMarker = useCallback(
    (worker: WorkerNearby) => {
      selectWorker(worker.id);
      const lat = worker.lat ?? (worker as any).latitude;
      const lng = worker.lng ?? (worker as any).longitude;
      if (lat && lng) {
        flyTo({ lat, lng }, true);
      }
    },
    [selectWorker, flyTo]
  );

  // Handle card press (card tap -> fly camera to marker & select)
  const handlePressCard = useCallback(
    (worker: WorkerNearby) => {
      selectWorker(worker.id);
      const lat = worker.lat ?? (worker as any).latitude;
      const lng = worker.lng ?? (worker as any).longitude;
      if (lat && lng) {
        flyTo({ lat, lng }, true);
      }
    },
    [selectWorker, flyTo]
  );

  // Handle book CTA button tap -> navigate to worker detail
  const handleBookWorker = useCallback(
    (worker: WorkerNearby) => {
      router.push(`/worker/${worker.id}`);
    },
    [router]
  );

  // Category label meta for panel header display
  const categoryLabel = useMemo(() => {
    if (!selectedCategory) return null;
    return getCategoryMeta(selectedCategory).label;
  }, [selectedCategory]);

  const handleRegionChange = useCallback(
    (region: any) => {
      onRegionChangeComplete(region, activeLocation);
    },
    [onRegionChangeComplete, activeLocation]
  );

  // Automatically synchronize map camera whenever active location changes (e.g. address selected)
  const prevActiveLocationRef = useRef<Coordinates | null>(null);
  useEffect(() => {
    if (activeLocation) {
      const prev = prevActiveLocationRef.current;
      if (!prev || prev.lat !== activeLocation.lat || prev.lng !== activeLocation.lng) {
        prevActiveLocationRef.current = activeLocation;
        if (validateServiceArea(activeLocation).isServiceable) {
          recenter(activeLocation);
        } else {
          recenter(FAISALABAD_CENTER);
        }
      }
    }
  }, [activeLocation, recenter]);

  const [isRecentering, setIsRecentering] = useState(false);

  const handleRecenter = useCallback(async () => {
    if (isRecentering) return;
    setIsRecentering(true);

    try {
      if (!isPermissionGranted) {
        const res = await requestLocation();
        if (!res.granted) {
          if (!res.canAskAgain) {
            openSettings();
          }
          return;
        }
      }

      if (!isServicesEnabled) {
        openSettings();
        return;
      }

      const freshCoords = await refreshLocation();
      if (freshCoords) {
        const validation = validateServiceArea(freshCoords);
        if (!validation.isServiceable) {
          Alert.alert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
          recenter(FAISALABAD_CENTER);
        } else {
          recenter(freshCoords);
        }
      } else if (gpsLocation && validateServiceArea(gpsLocation).isServiceable) {
        recenter(gpsLocation);
      } else if (activeLocation && validateServiceArea(activeLocation).isServiceable) {
        recenter(activeLocation);
      } else {
        recenter(FAISALABAD_CENTER);
      }
    } catch (_err) {
      if (gpsLocation && validateServiceArea(gpsLocation).isServiceable) {
        recenter(gpsLocation);
      } else if (activeLocation && validateServiceArea(activeLocation).isServiceable) {
        recenter(activeLocation);
      } else {
        recenter(FAISALABAD_CENTER);
      }
    } finally {
      setIsRecentering(false);
    }
  }, [
    isRecentering,
    isPermissionGranted,
    isServicesEnabled,
    requestLocation,
    openSettings,
    refreshLocation,
    recenter,
    gpsLocation,
    activeLocation,
  ]);

  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" />

      {/* 1. Full-screen map canvas */}
      <MapCanvas
        mapRef={mapRef}
        userLocation={activeLocation}
        workers={workers}
        selectedId={selectedId}
        onSelectWorker={handleSelectMarker}
        onRegionChangeComplete={handleRegionChange}
        radiusMeters={5000}
      />

      {/* 2. Floating Top Header & Category Filter Chips */}
      <MapTopBar showSearchBar={true} />

      {/* Floating Permission Warning Pill */}
      {(!isPermissionGranted || !isServicesEnabled) && (
        <Pressable
          style={styles.locationBanner}
          onPress={async () => {
            const res = await requestLocation();
            if (!res.granted && !res.canAskAgain) {
              openSettings();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Location disabled. Tap to enable"
        >
          <MapPin size={13} color={palette.white} />
          <Text style={styles.locationBannerText}>
            {!isServicesEnabled
              ? 'GPS is turned off. Tap to open settings'
              : 'Enable location to find nearby workers'}
          </Text>
          <Text style={styles.locationBannerAction}>Turn On</Text>
        </Pressable>
      )}

      {/* 3. Right-edge floating map controls stack (Recenter + Zoom) */}
      <MapControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onRecenter={handleRecenter}
        showRecenter={hasPannedAway || !activeLocation}
        style={styles.mapControlsPosition}
      />

      {/* 4. Bottom Draggable Panel containing Worker List */}
      <MapBottomPanel>
        <MapPanelHeader
          count={workers.length}
          isLoading={isLoading}
          categoryLabel={categoryLabel}
        />
        <MapWorkerList
          workers={workers}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelectWorker={handlePressCard}
          onBookWorker={handleBookWorker}
          onResetFilters={resetFilter}
        />
      </MapBottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  locationBanner: {
    position: 'absolute',
    top: 132,
    alignSelf: 'center',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.gray900,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    ...shadows.md,
  },
  locationBannerText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11,
    color: palette.white,
  },
  locationBannerAction: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 11,
    color: palette.green400,
    marginLeft: 2,
  },
  mapControlsPosition: {
    position: 'absolute',
    right: 16,
    bottom: 230, // Elevated above bottom sheet collapsed snap height
    zIndex: 15,
  },
});
