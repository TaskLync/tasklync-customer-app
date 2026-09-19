import { memo, FC, RefObject } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Coordinates } from '../../types/location.types';
import { WorkerNearby } from '../../types/worker.types';
import { UserMarker } from './UserMarker';
import { WorkerMarker } from './WorkerMarker';
import { RadiusCircle } from './RadiusCircle';
import { colors } from '../../design/colors';
import { FAISALABAD_CENTER, validateServiceArea } from '../../config/serviceArea.config';

const LIGHT_MAP_STYLE = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

interface MapCanvasProps {
  mapRef: RefObject<MapView | null>;
  userLocation: Coordinates | null;
  workers: WorkerNearby[];
  selectedId: string | null;
  onSelectWorker: (worker: WorkerNearby) => void;
  onRegionChangeComplete: (region: Region) => void;
  initialRegion?: Region;
  radiusMeters?: number;
}

export const MapCanvas: FC<MapCanvasProps> = memo(({
  mapRef,
  userLocation,
  workers,
  selectedId,
  onSelectWorker,
  onRegionChangeComplete,
  initialRegion,
  radiusMeters = 5000,
}) => {
  const isUserLocationServiceable = Boolean(
    userLocation && validateServiceArea(userLocation).isServiceable
  );
  const defaultRegion: Region = initialRegion || {
    latitude: isUserLocationServiceable && userLocation ? userLocation.lat : FAISALABAD_CENTER.lat,
    longitude: isUserLocationServiceable && userLocation ? userLocation.lng : FAISALABAD_CENTER.lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef as any}
        style={styles.mapView}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        customMapStyle={LIGHT_MAP_STYLE}
        initialRegion={defaultRegion}
        onRegionChangeComplete={(r) => onRegionChangeComplete(r)}
        showsUserLocation={false} // Custom UserMarker handles live dot
        showsCompass={false}
        showsMyLocationButton={false}
        showsScale={false}
        showsBuildings={true}
        showsIndoors={false}
        toolbarEnabled={false}
        pitchEnabled={true}
        rotateEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}
        loadingEnabled={true}
      >
        {/* Search radius overlay */}
        <RadiusCircle center={userLocation} radiusMeters={radiusMeters} />

        {/* Current user location dot */}
        <UserMarker location={userLocation} />

        {/* Worker pin markers */}
        {workers.map((worker, index) => {
          const lat = worker.lat ?? (worker as any).latitude;
          const lng = worker.lng ?? (worker as any).longitude;
          if (!lat || !lng) return null;

          return (
            <WorkerMarker
              key={worker.id}
              worker={worker}
              isSelected={worker.id === selectedId}
              onSelect={onSelectWorker}
              index={index}
            />
          );
        })}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgApp,
  },
  mapView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
