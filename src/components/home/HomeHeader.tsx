import { useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MapPin, ChevronDown } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text } from '../ui/Text/Text';
import { NotificationBell } from './NotificationBell';
import { LocationSelectSheet, LocationSelectSheetRef } from './LocationSelectSheet';
import { useAuthStore } from '../../store/auth.store';
import { useCurrentUser } from '../../hooks/useProfile';
import { useLocation } from '../../hooks/useLocation';
import { useLocationStore } from '../../store/location.store';
import { useAddresses } from '../../hooks/useAddresses';
import { SkeletonHomeHeader } from '../ui/Skeleton';
import { colors, palette } from '../../design/colors';
import { fontFamily } from '../../design/typography';

export const HomeHeader = () => {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const { user: profileUser } = useCurrentUser();
  const user = profileUser || authUser;
  const avatarUrl = user?.avatar_url || (user as any)?.avatarUrl;

  const { cityName, isLocating, locationMode, selectedAddress, location } = useLocation();
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const currentStoreCity = useLocationStore((state) => state.currentCity);
  const { addresses } = useAddresses();

  const sheetRef = useRef<LocationSelectSheetRef>(null);
  const [imageError, setImageError] = useState(false);

  // Dynamic address / GPS resolution respecting user selection
  const defaultAddress = addresses?.find((a) => a.is_default) || addresses?.[0];
  const savedAddressLine = defaultAddress?.address_line || defaultAddress?.city;

  const displayLocation = (() => {
    // 1. Explicit address mode with a selected address
    if (locationMode === 'address' && selectedAddress) {
      return (
        selectedAddress.custom_label ||
        selectedAddress.label ||
        selectedAddress.address_line ||
        selectedAddress.city ||
        'Saved Address'
      );
    }

    // 2. GPS Location successfully resolved: persist and keep showing city name or "Current Location" without flickering
    if (currentLocation || location) {
      const validCity =
        cityName &&
        cityName !== 'Your area' &&
        cityName !== 'Current Area' &&
        cityName !== 'Locating...' &&
        cityName !== 'Select location'
          ? cityName
          : currentStoreCity &&
            currentStoreCity !== 'Your area' &&
            currentStoreCity !== 'Current Area' &&
            currentStoreCity !== 'Locating...'
          ? currentStoreCity
          : null;

      return validCity || 'Current Location';
    }

    // 3. Initial locating state (only when location has never been resolved yet)
    if (isLocating) {
      return 'Locating...';
    }

    // 4. Default saved address fallback (e.g. permission denied)
    if (savedAddressLine) {
      return savedAddressLine;
    }

    // 5. Default unresolved fallback
    return 'Select location';
  })();

  const handleLocationPress = () => {
    sheetRef.current?.open();
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile' as any);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (isLocating && !currentLocation && !location && !cityName && !currentStoreCity && !savedAddressLine) {
    return <SkeletonHomeHeader />;
  }

  return (
    <View style={styles.container}>
      {/* LEFT: Location Pin + Dynamic Real Address + Downward Chevron */}
      <View style={styles.leftSide}>
        <Pressable
          onPress={handleLocationPress}
          style={({ pressed }) => [
            styles.locationButton,
            pressed && styles.locationButtonPressed,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Location: ${displayLocation}. Tap to change location`}
          accessibilityHint="Opens location selector"
        >
          <MapPin size={20} color="#16A05D" strokeWidth={2.2} />
          <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
            {displayLocation}
          </Text>
          <ChevronDown size={14} color={palette.gray400} strokeWidth={2.2} style={styles.chevron} />
        </Pressable>
      </View>

      {/* RIGHT: Notification Bell (with red dot) + User Avatar */}
      <View style={styles.rightSide}>
        <NotificationBell
          variant="dot"
          size={36}
          iconSize={22}
          showDot={true}
        />

        <Pressable
          onPress={handleProfilePress}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && styles.avatarButtonPressed,
          ]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          {avatarUrl && !imageError ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={150}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {getInitials(user?.name)}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <LocationSelectSheet ref={sheetRef} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  leftSide: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  locationButtonPressed: {
    opacity: 0.75,
  },
  locationText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 6,
    marginRight: 4,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  chevron: {
    flexShrink: 0,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.green100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 13,
    color: colors.primaryDark,
  },
});
