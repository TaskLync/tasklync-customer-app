import { FC, memo, useEffect, useState } from 'react';
import { StyleSheet, View, Image, Text, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { WorkerNearby } from '../../types/worker.types';
import { WorkerMarkerBadge } from './WorkerMarkerBadge';
import { colors } from '../../design/colors';

interface WorkerMarkerProps {
  worker: WorkerNearby;
  isSelected: boolean;
  onSelect: (worker: WorkerNearby) => void;
  index?: number;
}

export const WorkerMarker: FC<WorkerMarkerProps> = memo(({
  worker,
  isSelected,
  onSelect,
}) => {
  // Markers are rasterised once when tracksViewChanges is false (Android), so a remote avatar that
  // finishes loading later, or the selected-state restyle, would never show. Track changes only
  // briefly after mount / selection change / avatar load, then freeze to keep the map cheap.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), worker.avatarUrl ? 2000 : 250);
    return () => clearTimeout(t);
  }, [isSelected, worker.avatarUrl]);

  const lat = (worker as any).lat || (worker as any).latitude;
  const lng = (worker as any).lng || (worker as any).longitude;

  if (!lat || !lng) return null;

  const handlePress = () => {
    onSelect(worker);
  };

  const primaryCategory = worker.categories && worker.categories.length > 0
    ? worker.categories[0]
    : undefined;

  const isBusy = worker.availabilityStatus === 'BUSY' || worker.isOnJob;
  const statusColor = isBusy ? colors.busy : colors.online;

  return (
    <Marker
      coordinate={{
        latitude: Number(lat),
        longitude: Number(lng),
      }}
      onPress={handlePress}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={isSelected ? 99 : 1}
    >
      <View style={[styles.markerContainer, isSelected && styles.markerContainerSelected]}>
        <View style={[styles.pinOuter, isSelected && styles.pinSelected]}>
          <View style={[styles.statusRing, { borderColor: statusColor }]}>
            {worker.avatarUrl ? (
              <Image
                source={{ uri: worker.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
                onLoadEnd={() => setTracksViewChanges(false)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Category badge anchor */}
        <View style={styles.badgeAnchor}>
          <WorkerMarkerBadge category={primaryCategory} size={18} />
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  markerContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainerSelected: {
    transform: [{ scale: 1.18 }],
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
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  pinSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  badgeAnchor: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
