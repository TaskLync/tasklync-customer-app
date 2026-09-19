import { memo, FC, RefObject } from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { WorkerNearby } from '../../types/worker.types';
import { Coordinates } from '../../types/location.types';
import { WorkerMarkerBadge } from './WorkerMarkerBadge';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';
import { FAISALABAD_CENTER, validateServiceArea } from '../../config/serviceArea.config';

interface MapCanvasProps {
  mapRef: RefObject<any>;
  userLocation: Coordinates | null;
  workers: WorkerNearby[];
  selectedId: string | null;
  onSelectWorker: (worker: WorkerNearby) => void;
  onRegionChangeComplete: (region: any) => void;
  initialRegion?: any;
  radiusMeters?: number;
}

export const MapCanvas: FC<MapCanvasProps> = memo(({
  userLocation,
  workers,
  selectedId,
  onSelectWorker,
}) => {
  const isUserLocationServiceable = Boolean(
    userLocation && validateServiceArea(userLocation).isServiceable
  );
  const centerLat = isUserLocationServiceable && userLocation ? userLocation.lat : FAISALABAD_CENTER.lat;
  const centerLng = isUserLocationServiceable && userLocation ? userLocation.lng : FAISALABAD_CENTER.lng;

  return (
    <View style={styles.container}>
      {/* SVG / Styled Map Background Simulation for Web */}
      <View style={styles.mapGridBackground}>
        {/* Vector road lines simulation */}
        <View style={[styles.roadHorizontal, { top: '30%' }]} />
        <View style={[styles.roadHorizontal, { top: '65%' }]} />
        <View style={[styles.roadVertical, { left: '25%' }]} />
        <View style={[styles.roadVertical, { left: '60%' }]} />
        <View style={[styles.roadDiagonal]} />

        {/* Park area blob */}
        <View style={styles.parkBlob} />
        <View style={styles.riverLine} />

        {/* Search radius circle centered on user */}
        <View style={styles.radiusCircleWeb} />

        {/* Pulsing User Location Marker */}
        <View style={styles.userMarkerWebContainer}>
          <View style={styles.userMarkerPulseRing} />
          <View style={styles.userMarkerWhiteRing}>
            <View style={styles.userMarkerBlueDot} />
          </View>
          <View style={styles.userLabelBadge}>
            <Text style={styles.userLabelText}>You are here</Text>
          </View>
        </View>

        {/* Worker Pin Markers on Web Canvas */}
        {workers.map((worker, index) => {
          const lat = (worker as any).lat || (worker as any).latitude || (centerLat + (index % 3 === 0 ? 0.006 : -0.005) * ((index + 1) * 0.7));
          const lng = (worker as any).lng || (worker as any).longitude || (centerLng + (index % 2 === 0 ? 0.007 : -0.006) * ((index + 1) * 0.8));

          // Project lat/lng to percentage offset on canvas
          const latDiff = (lat - centerLat) * 3500;
          const lngDiff = (lng - centerLng) * 3500;

          const topPercent = Math.max(12, Math.min(80, 50 - latDiff));
          const leftPercent = Math.max(10, Math.min(85, 50 + lngDiff));

          const isSelected = worker.id === selectedId;
          const primaryCategory = worker.categories && worker.categories.length > 0 ? worker.categories[0] : undefined;
          const isBusy = worker.availabilityStatus === 'BUSY' || worker.isOnJob;
          const statusColor = isBusy ? colors.busy : colors.online;

          return (
            <Pressable
              key={worker.id}
              style={({ pressed }) => [
                styles.webMarkerWrapper,
                { top: `${topPercent}%`, left: `${leftPercent}%` },
                isSelected && styles.webMarkerSelectedWrapper,
                pressed && styles.webMarkerPressed,
              ]}
              onPress={() => onSelectWorker(worker)}
            >
              <View style={[styles.pinOuter, isSelected && styles.pinSelected]}>
                <View style={[styles.statusRing, { borderColor: statusColor }]}>
                  {worker.avatarUrl ? (
                    <Image source={{ uri: worker.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.badgeAnchor}>
                <WorkerMarkerBadge category={primaryCategory || 'electrician'} size={18} />
              </View>

              {/* Tooltip on Web Hover / Selected */}
              {isSelected && (
                <View style={styles.markerTooltip}>
                  <Text style={styles.tooltipName} numberOfLines={1}>{worker.name}</Text>
                  <Text style={styles.tooltipMeta}>★ {worker.avgRating} • {worker.distanceLabel || '1.2 km'}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
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
    backgroundColor: '#F8FAF9',
  },
  mapGridBackground: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#EBF2EE',
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  roadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  roadDiagonal: {
    position: 'absolute',
    top: -50,
    left: '40%',
    width: 10,
    height: '140%',
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '35deg' }],
  },
  parkBlob: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 140,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DCFCE7',
    opacity: 0.8,
  },
  riverLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '75%',
    width: 24,
    backgroundColor: '#BAE6FD',
    opacity: 0.6,
  },
  radiusCircleWeb: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 320,
    height: 320,
    marginLeft: -160,
    marginTop: -160,
    borderRadius: 160,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    pointerEvents: 'none',
  },
  userMarkerWebContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  userMarkerPulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  userMarkerWhiteRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  userMarkerBlueDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
  },
  userLabelBadge: {
    position: 'absolute',
    bottom: -18,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userLabelText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  webMarkerWrapper: {
    position: 'absolute',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  webMarkerSelectedWrapper: {
    zIndex: 100,
  },
  webMarkerPressed: {
    transform: [{ scale: 0.94 }],
  },
  pinOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bgCard,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  pinSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    transform: [{ scale: 1.25 }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    elevation: 8,
  },
  statusRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSection,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  badgeAnchor: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  markerTooltip: {
    position: 'absolute',
    top: -36,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  tooltipName: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  tooltipMeta: {
    fontFamily: typography.fontFamily.inter.medium,
    fontSize: 10,
    color: '#94A3B8',
  },
});
