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
  Text,
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
import { LocationIcon } from '../ui/Icon/icons';
import { MapRegion } from '../../types/address.types';
import { FAISALABAD_DEFAULT_REGION } from '../../config/serviceArea.config';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '../../design/mapStyles';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { fontFamily } from '../../design';
import { trackLocationEvent } from '../../services/location/locationTelemetry';

export interface AddressPickerMapRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  getMapRef: () => MapView | null;
}

export interface AddressPickerMapProps {
  initialRegion?: MapRegion | undefined;
  onRegionChange?: ((region: MapRegion) => void) | undefined;
  onRegionChangeComplete: (region: MapRegion) => void;
  /**
   * Show the platform "you are here" dot (with its accuracy circle) so the customer can see how
   * far the pin is from their real position. Only when location permission is granted.
   */
  showsUserLocation?: boolean | undefined;
}

const DEFAULT_REGION: MapRegion = FAISALABAD_DEFAULT_REGION;
/** No tiles after this long usually means no connectivity / key or billing problem. */
const MAP_LOAD_TIMEOUT_MS = 12_000;

export const AddressPickerMap = forwardRef<AddressPickerMapRef, AddressPickerMapProps>(
  ({ initialRegion = DEFAULT_REGION, onRegionChange, onRegionChangeComplete, showsUserLocation = false }, ref) => {
    const { colors, isDark } = useAppTheme();
    const styles = useThemedStyles(createStyles);
    const mapRef = useRef<MapView | null>(null);
    const isMapReadyRef = useRef<boolean>(false);
    const [tilesFailed, setTilesFailed] = useState(false);
    const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Tiles never loading must be explained, not shown as a blank map. The pin, search and "use my
    // location" keep working; the overlay disappears as soon as the map renders.
    useEffect(() => {
      loadTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setTilesFailed(true);
          trackLocationEvent('map_load_timeout', { ms: MAP_LOAD_TIMEOUT_MS });
        }
      }, MAP_LOAD_TIMEOUT_MS);
      return () => {
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
      };
    }, []);

    const handleMapLoaded = useCallback(() => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
      setTilesFailed(false);
    }, []);
    const pendingAnimateRegionRef = useRef<{ region: MapRegion; duration: number } | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const isMountedRef = useRef<boolean>(true);
    const [reduceMotion, setReduceMotion] = useState(false);

    // Reanimated values for pin lift & drop bounce
    const pinTranslateY = useSharedValue(0);
    const pinScale = useSharedValue(1);
    const shadowScale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.25);

    useEffect(() => {
      isMountedRef.current = true;
      let isLocalMounted = true;
      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          if (isLocalMounted) setReduceMotion(enabled);
        })
        .catch(() => {
          if (isLocalMounted) setReduceMotion(false);
        });

      return () => {
        isMountedRef.current = false;
        isLocalMounted = false;
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
        if (!isMountedRef.current) return;
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
        if (
          onRegionChange &&
          typeof region?.latitude === 'number' &&
          !isNaN(region.latitude) &&
          typeof region?.longitude === 'number' &&
          !isNaN(region.longitude)
        ) {
          onRegionChange(region);
        }
      },
      [onRegionChange, pinScale, pinTranslateY, reduceMotion, shadowOpacity, shadowScale]
    );

    const handleRegionChangeComplete = useCallback(
      (region: MapRegion) => {
        if (!isMountedRef.current) return;
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
        if (
          typeof region?.latitude === 'number' &&
          !isNaN(region.latitude) &&
          typeof region?.longitude === 'number' &&
          !isNaN(region.longitude) &&
          (Math.abs(region.latitude) > 0.0001 || Math.abs(region.longitude) > 0.0001)
        ) {
          onRegionChangeComplete(region);
        }
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
          customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          initialRegion={initialRegion}
          onMapReady={handleMapReady}
          onMapLoaded={handleMapLoaded}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          showsIndoors={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          loadingEnabled
        />

        {tilesFailed && (
          <View style={styles.tilesFailedOverlay} pointerEvents="none" accessibilityLiveRegion="polite">
            <Text style={styles.tilesFailedTitle} maxFontSizeMultiplier={1.3}>
              Map couldn&apos;t load
            </Text>
            <Text style={styles.tilesFailedText} maxFontSizeMultiplier={1.3}>
              Check your internet connection. You can still search for your area or use your location. The pin
              in the centre is what will be saved.
            </Text>
          </View>
        )}

        {/* Fixed Absolutely-Positioned Center Pin Overlay */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          {/* Ground drop shadow */}
          <Animated.View style={[styles.pinGroundShadow, shadowAnimatedStyle]} />

          {/* Floating animated pin icon */}
          <Animated.View style={[styles.pinIconWrapper, pinAnimatedStyle]}>
            <View style={styles.pinHead}>
              <LocationIcon size={34} color={colors.primaryDark} strokeWidth={2.4} />
              <View style={styles.pinDot} />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }
);

AddressPickerMap.displayName = 'AddressPickerMap';

const createStyles = ({ palette, colors }: AppTheme) => StyleSheet.create({
  tilesFailedOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '30%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.bottomSheetBackground,
    borderWidth: 1,
    borderColor: palette.gray200,
    zIndex: 5,
  },
  tilesFailedTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tilesFailedText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
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
    backgroundColor: palette.black,
  },
});
