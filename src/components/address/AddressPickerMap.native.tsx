import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  StyleSheet,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MapPin } from 'lucide-react-native';
import { MapRegion } from '../../types/address.types';
import { colors, palette } from '../../design';
import { FAISALABAD_DEFAULT_REGION } from '../../config/serviceArea.config';

export interface AddressPickerMapRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  getMapRef: () => MapView | null;
}

export interface AddressPickerMapProps {
  initialRegion?: MapRegion | undefined;
  onRegionChange?: ((region: MapRegion) => void) | undefined;
  onRegionChangeComplete: (region: MapRegion) => void;
}

const DEFAULT_REGION: MapRegion = FAISALABAD_DEFAULT_REGION;

export const AddressPickerMap = forwardRef<AddressPickerMapRef, AddressPickerMapProps>(
  ({ initialRegion = DEFAULT_REGION, onRegionChange, onRegionChangeComplete }, ref) => {
    const mapRef = useRef<MapView | null>(null);
    const isMapReadyRef = useRef<boolean>(false);
    const pendingAnimateRegionRef = useRef<{ region: MapRegion; duration: number } | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    // Reanimated values for pin lift & drop bounce
    const pinTranslateY = useSharedValue(0);
    const pinScale = useSharedValue(1);
    const shadowScale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.25);

    useEffect(() => {
      let isMounted = true;
      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          if (isMounted) setReduceMotion(enabled);
        })
        .catch(() => {
          if (isMounted) setReduceMotion(false);
        });

      return () => {
        isMounted = false;
      };
    }, []);

    const handleMapReady = useCallback(() => {
      isMapReadyRef.current = true;
      if (pendingAnimateRegionRef.current && mapRef.current) {
        const { region, duration } = pendingAnimateRegionRef.current;
        pendingAnimateRegionRef.current = null;
        try {
          mapRef.current.animateToRegion(region, duration);
        } catch (_e) {
          // Guard against race conditions
        }
      }
    }, []);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion, duration = 400) => {
        if (
          typeof region?.latitude === 'number' &&
          !isNaN(region.latitude) &&
          typeof region?.longitude === 'number' &&
          !isNaN(region.longitude)
        ) {
          if (!isMapReadyRef.current) {
            pendingAnimateRegionRef.current = { region, duration };
            return;
          }
          try {
            mapRef.current?.animateToRegion(region, duration);
          } catch (_e) {
            // Guard against native view detach races
          }
        }
      },
      getMapRef: () => mapRef.current,
    }));

    const handleRegionChange = useCallback(
      (region: MapRegion) => {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          if (reduceMotion) {
            pinTranslateY.value = -8;
            pinScale.value = 1.04;
            shadowScale.value = 0.7;
            shadowOpacity.value = 0.15;
          } else {
            pinTranslateY.value = withTiming(-10, { duration: 120 });
            pinScale.value = withTiming(1.05, { duration: 120 });
            shadowScale.value = withTiming(0.65, { duration: 120 });
            shadowOpacity.value = withTiming(0.12, { duration: 120 });
          }
        }
        if (onRegionChange) {
          onRegionChange(region);
        }
      },
      [onRegionChange, pinScale, pinTranslateY, reduceMotion, shadowOpacity, shadowScale]
    );

    const handleRegionChangeComplete = useCallback(
      (region: MapRegion) => {
        isDraggingRef.current = false;
        if (reduceMotion) {
          pinTranslateY.value = 0;
          pinScale.value = 1.0;
          shadowScale.value = 1.0;
          shadowOpacity.value = 0.25;
        } else {
          // Snappy spring landing bounce (150ms)
          pinTranslateY.value = withSpring(0, { damping: 16, stiffness: 350 });
          pinScale.value = withSpring(1.0, { damping: 16, stiffness: 350 });
          shadowScale.value = withSpring(1.0, { damping: 16, stiffness: 350 });
          shadowOpacity.value = withTiming(0.25, { duration: 150 });
        }
        onRegionChangeComplete(region);
      },
      [onRegionChangeComplete, pinScale, pinTranslateY, reduceMotion, shadowOpacity, shadowScale]
    );

    const pinAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: pinTranslateY.value },
        { scale: pinScale.value },
      ],
    }));

    const shadowAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: shadowScale.value }],
      opacity: shadowOpacity.value,
    }));

    return (
      <View style={styles.container}>
        {/* Native Map View */}
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          onMapReady={handleMapReady}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          showsIndoors={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          loadingEnabled={true}
        />

        {/* Fixed Absolutely-Positioned Center Pin Overlay */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          {/* Ground drop shadow */}
          <Animated.View style={[styles.pinGroundShadow, shadowAnimatedStyle]} />

          {/* Floating animated pin icon */}
          <Animated.View style={[styles.pinIconWrapper, pinAnimatedStyle]}>
            <View style={styles.pinHead}>
              <MapPin size={34} color={colors.primaryDark} strokeWidth={2.4} />
              <View style={styles.pinDot} />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }
);

AddressPickerMap.displayName = 'AddressPickerMap';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.gray900,
  },
});
