import { FC, useEffect } from 'react';
import { StyleSheet, View, Text, Image, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Star, MapPin, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { WorkerNearby } from '../../types/worker.types';
import { WorkerMarkerBadge } from './WorkerMarkerBadge';
import { typography } from '../../design/typography';
import { springConfig } from '../../design/animations';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface MapWorkerCardProps {
  worker: WorkerNearby;
  isSelected: boolean;
  onPressCard: (worker: WorkerNearby) => void;
  onPressBook?: ((worker: WorkerNearby) => void) | undefined;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MapWorkerCard: FC<MapWorkerCardProps> = ({
  worker,
  isSelected,
  onPressCard,
  onPressBook,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(isSelected ? 2 : 1);

  useEffect(() => {
    borderWidth.value = withSpring(isSelected ? 2 : 1, springConfig.stiff);
  }, [isSelected, borderWidth]);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, springConfig.default);
  };

  const handleCardPress = () => {
    onPressCard(worker);
  };

  const handleBookPress = (e?: any) => {
    e?.stopPropagation?.();
    if (onPressBook) {
      onPressBook(worker);
    } else {
      router.push(`/worker/${worker.id}` as any);
    }
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: isSelected ? colors.primary : colors.border,
    borderWidth: borderWidth.value,
  }));

  const primaryCategory = worker.categories && worker.categories.length > 0
    ? worker.categories[0]
    : undefined;

  const formattedDistance = worker.distanceLabel || (
    worker.distanceMeters !== undefined
      ? (worker.distanceMeters >= 1000
          ? `${(worker.distanceMeters / 1000).toFixed(1)} km`
          : `${Math.round(worker.distanceMeters)} m`)
      : '1.2 km'
  );

  return (
    <AnimatedPressable
      style={[
        styles.card,
        isSelected && styles.selectedShadow,
        containerAnimatedStyle,
      ]}
      onPress={handleCardPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`Worker ${worker.name}, Rating ${worker.avgRating}, Distance ${formattedDistance}`}
    >
      {/* Avatar Container */}
      <View style={styles.avatarWrapper}>
        {worker.avatarUrl ? (
          <Image
            source={{ uri: worker.avatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>
              {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
            </Text>
          </View>
        )}
        <View style={styles.badgeContainer}>
          <WorkerMarkerBadge category={primaryCategory || ''} size={16} />
        </View>
      </View>

      {/* Main Info */}
      <View style={styles.infoContainer}>
        {/* Name (Poppins) */}
        <Text style={styles.nameText} numberOfLines={1}>
          {worker.name}
        </Text>

        {/* Rating & Distance (Inter numbers) */}
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>
              {worker.avgRating ? worker.avgRating.toFixed(1) : '4.9'}
            </Text>
          </View>

          <View style={styles.dotSeparator} />

          <View style={styles.metaBadge}>
            <MapPin size={11} color={colors.textMuted} />
            <Text style={styles.distanceText}>{formattedDistance}</Text>
          </View>
        </View>

        {/* Response Time or Price */}
        <View style={styles.subMetaRow}>
          <Clock size={11} color={colors.textMuted} />
          <Text style={styles.responseTimeText}>
            {worker.responseTimeMins
              ? `~${worker.responseTimeMins} mins response`
              : 'Fast response'}
          </Text>
        </View>
      </View>

      {/* Book CTA Button (>= 44px tap target height) */}
      <Pressable
        style={({ pressed }) => [
          styles.bookButton,
          pressed && styles.bookButtonPressed,
        ]}
        onPress={handleBookPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Book ${worker.name}`}
      >
        <Text style={styles.bookButtonText}>Book</Text>
      </Pressable>
    </AnimatedPressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    width: 270,
    height: 146,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedShadow: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarWrapper: {
    width: 52,
    height: 52,
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgSection,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: typography.fontSize.h4,
    color: colors.primaryDark,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: typography.fontSize.body2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: typography.fontFamily.inter.bold, // Inter font for measurement data
    fontSize: typography.fontSize.caption,
    color: colors.textPrimary,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: 6,
  },
  distanceText: {
    fontFamily: typography.fontFamily.inter.medium, // Inter font for measurement data
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseTimeText: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  bookButton: {
    height: 44, // Fitts's Law: min 44px height tap target even inside small card container
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bookButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.96 }],
  },
  bookButtonText: {
    fontFamily: typography.fontFamily.jakarta.semiBold, // Plus Jakarta Sans for button label
    fontSize: typography.fontSize.caption,
    color: colors.textOnGreen,
  },
});
