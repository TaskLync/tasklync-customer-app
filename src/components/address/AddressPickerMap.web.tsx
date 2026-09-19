import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MapPin, Navigation } from 'lucide-react-native';
import { MapRegion } from '../../types/address.types';
import { colors, palette, fontFamily, radius } from '../../design';
import { FAISALABAD_DEFAULT_REGION } from '../../config/serviceArea.config';

export interface AddressPickerMapRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  getMapRef: () => null;
}

export interface AddressPickerMapProps {
  initialRegion?: MapRegion | undefined;
  onRegionChange?: ((region: MapRegion) => void) | undefined;
  onRegionChangeComplete: (region: MapRegion) => void;
}

const DEFAULT_REGION: MapRegion = FAISALABAD_DEFAULT_REGION;

export const AddressPickerMap = forwardRef<AddressPickerMapRef, AddressPickerMapProps>(
  ({ initialRegion = DEFAULT_REGION, onRegionChangeComplete }, ref) => {
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
      lat: initialRegion.latitude,
      lng: initialRegion.longitude,
    });

    const pinTranslateY = useSharedValue(0);
    const pinScale = useSharedValue(1);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion) => {
        setCurrentCoords({ lat: region.latitude, lng: region.longitude });
        pinTranslateY.value = withTiming(-10, { duration: 100 }, () => {
          pinTranslateY.value = withSpring(0, { damping: 16, stiffness: 350 });
        });
      },
      getMapRef: () => null,
    }));

    const handleMapClick = useCallback(
      () => {
        // Subtle delta shift on click to simulate pan
        const newLat = currentCoords.lat + (Math.random() - 0.5) * 0.002;
        const newLng = currentCoords.lng + (Math.random() - 0.5) * 0.002;
        setCurrentCoords({ lat: newLat, lng: newLng });

        pinTranslateY.value = withTiming(-12, { duration: 100 }, () => {
          pinTranslateY.value = withSpring(0, { damping: 14, stiffness: 320 });
        });

        onRegionChangeComplete({
          latitude: newLat,
          longitude: newLng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        });
      },
      [currentCoords, onRegionChangeComplete, pinTranslateY]
    );

    const pinAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: pinTranslateY.value },
        { scale: pinScale.value },
      ],
    }));

    return (
      <Pressable onPress={handleMapClick} style={styles.container}>
        {/* Web Interactive Simulation Canvas */}
        <View style={styles.mapGridBackground}>
          {/* Vector road grid */}
          <View style={[styles.roadHorizontal, { top: '25%' }]} />
          <View style={[styles.roadHorizontal, { top: '55%' }]} />
          <View style={[styles.roadHorizontal, { top: '80%' }]} />
          <View style={[styles.roadVertical, { left: '20%' }]} />
          <View style={[styles.roadVertical, { left: '50%' }]} />
          <View style={[styles.roadVertical, { left: '75%' }]} />
          <View style={styles.roadDiagonal} />

          {/* Green zones & rivers */}
          <View style={styles.parkBlob} />
          <View style={styles.riverLine} />

          {/* Web interactive notice badge */}
          <View style={styles.webNoticeBadge}>
            <Navigation size={13} color={colors.primaryDark} />
            <Text style={styles.webNoticeText}>
              Click anywhere on map to reposition pin
            </Text>
          </View>
        </View>

        {/* Fixed Absolutely-Positioned Center Pin Overlay */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.pinGroundShadow} />
          <Animated.View style={[styles.pinIconWrapper, pinAnimatedStyle]}>
            <View style={styles.pinHead}>
              <MapPin size={36} color={colors.primaryDark} strokeWidth={2.4} />
              <View style={styles.pinDot} />
            </View>
          </Animated.View>
        </View>
      </Pressable>
    );
  }
);

AddressPickerMap.displayName = 'AddressPickerMap';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#EBF2EE',
  },
  mapGridBackground: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  roadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 16,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  roadDiagonal: {
    position: 'absolute',
    top: -100,
    left: '35%',
    width: 12,
    height: '160%',
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '35deg' }],
  },
  parkBlob: {
    position: 'absolute',
    top: '15%',
    right: '12%',
    width: 160,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#DCFCE7',
    opacity: 0.7,
  },
  riverLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '70%',
    width: 28,
    backgroundColor: '#BAE6FD',
    opacity: 0.6,
  },
  webNoticeBadge: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.green200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  webNoticeText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  pinHead: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    position: 'absolute',
    top: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.white,
  },
  pinGroundShadow: {
    position: 'absolute',
    width: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
});
