import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Navigation } from 'lucide-react-native';
import { BookingAddress } from '../../store/bookingDraft.store';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { withAlpha } from '../../design/colorUtils';

export interface MiniMapPreviewProps {
  selectedAddress: BookingAddress | null;
}

export const MiniMapPreview: React.FC<MiniMapPreviewProps> = ({ selectedAddress }) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handlePress = () => {
    if (selectedAddress?.id) {
      router.push({
        pathname: '/profile/addresses/add',
        params: { mode: 'edit', addressId: selectedAddress.id, returnToBooking: 'true' },
      });
    } else {
      router.push({
        pathname: '/profile/addresses/add',
        params: { mode: 'add', returnToBooking: 'true' },
      });
    }
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={handlePress} style={styles.mapContainer}>
        {/* Mock Map Texture View */}
        <View style={styles.mapBackground}>
          {/* Simulated Map Grid / Roads */}
          <View style={styles.roadHorizontal} />
          <View style={styles.roadVertical} />

          {/* Location Pin */}
          <View style={styles.pinWrapper}>
            <View style={styles.pinPulse} />
            <View style={styles.pinCircle}>
              <MapPin size={18} color={palette.pureWhite} fill={colors.primary} />
            </View>
          </View>
        </View>

        {/* Overlay Footer Bar */}
        <View style={styles.overlayBar}>
          <View style={styles.textGroup}>
            <Text style={styles.overlayTitle}>Location Details</Text>
            <Text style={styles.overlaySub} numberOfLines={1}>
              {selectedAddress
                ? `${selectedAddress.street}, ${selectedAddress.city}`
                : 'Tap to view on map'}
            </Text>
          </View>

          <View style={styles.adjustBadge}>
            <Navigation size={12} color={colors.primaryDark} />
            <Text style={styles.adjustText}>Adjust Pin</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.gray100,
    backgroundColor: palette.white,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  mapContainer: {
    height: 120,
    position: 'relative',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: colors.bgCard,
    top: 50,
  },
  roadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: colors.bgCard,
    left: '45%',
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  overlayBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: withAlpha(colors.bgCard, 0.94),
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: palette.gray200,
  },
  textGroup: {
    flex: 1,
    marginRight: 8,
  },
  overlayTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  overlaySub: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  adjustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.green50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adjustText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
  },
});
