import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '../../design/colors';
import { Coordinates } from '../../types/location.types';

interface UserMarkerProps {
  location: Coordinates | null;
}

export const UserMarker: FC<UserMarkerProps> = ({ location }) => {
  if (!location || !location.lat || !location.lng) {
    return null;
  }

  return (
    <Marker
      coordinate={{
        latitude: location.lat,
        longitude: location.lng,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={999}
    >
      <View style={styles.container}>
        {/* Semi-transparent outer pulse ring */}
        <View style={styles.pulseRing} />
        {/* White inner border ring */}
        <View style={styles.whiteRing}>
          {/* Solid blue center dot */}
          <View style={styles.blueDot} />
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  whiteRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  blueDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
  },
});
