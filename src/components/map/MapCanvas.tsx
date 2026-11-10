import { memo, FC, RefObject } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import MapView, { Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Coordinates } from '../../types/location.types';
import { WorkerNearby } from '../../types/worker.types';
import { UserMarker } from './UserMarker';
import { WorkerMarker } from './WorkerMarker';
import { RadiusCircle } from './RadiusCircle';
import { FAISALABAD_CENTER, validateServiceArea } from '../../config/serviceArea.config';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '../../design/mapStyles';

interface MapCanvasProps {
  mapRef: RefObject<MapView | null>;
  /** Verified live GPS fix (blue "you are here" dot). Null when no fresh fix exists. */
  userLocation: Coordinates | null;
  /** Where nearby workers are being searched (live GPS or the selected saved address). */
  searchCenter?: Coordinates | null;
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
  searchCenter,
  workers,
  selectedId,
  onSelectWorker,
  onRegionChangeComplete,
  initialRegion,
  radiusMeters = 5000,
}) => {
  const { isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const center = searchCenter ?? userLocation;
  const isUserLocationServiceable = Boolean(
    center && validateServiceArea(center).isServiceable
  );
  const defaultRegion: Region = initialRegion || {
    latitude: isUserLocationServiceable && center ? center.lat : FAISALABAD_CENTER.lat,
    longitude: isUserLocationServiceable && center ? center.lng : FAISALABAD_CENTER.lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef as any}
        style={styles.mapView}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
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
        <RadiusCircle center={center} radiusMeters={radiusMeters} />

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

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
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
