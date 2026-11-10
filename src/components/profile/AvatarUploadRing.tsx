import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Camera } from 'lucide-react-native';
import { fontFamily, shadows } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AvatarUploadRingProps {
  imageUri?: string | null | undefined;
  name?: string | null | undefined;
  progress?: number | null | undefined; // 0.0 to 1.0, null when idle
  size?: number; // default 80
  strokeWidth?: number; // default 4
  onPress?: () => void;
  showEditBadge?: boolean;
}

/**
 * AvatarUploadRing Component (Day 35 Hard Problem #4)
 *
 * Implements Real Upload Progress Visualization:
 * - Accepts real upload progress (0-1) driven directly by HTTP onUploadProgress
 * - SVG animated circular stroke-dashoffset tracking real network transfer
 * - 150ms smooth fadeout upon upload completion
 */
export const AvatarUploadRing: React.FC<AvatarUploadRingProps> = ({
  imageUri,
  name,
  progress = null,
  size = 80,
  strokeWidth = 3.5,
  onPress,
  showEditBadge = false,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isUploading = progress !== null && progress >= 0 && progress <= 1;

  const radiusVal = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusVal;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (progress !== null) {
      animatedProgress.value = withTiming(progress, {
        duration: 200,
        easing: Easing.out(Easing.quad),
      });
    } else {
      animatedProgress.value = 0;
    }
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - circumference * animatedProgress.value;
    return {
      strokeDashoffset,
    };
  });

  const getInitials = () => {
    if (!name) return 'TL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const avatarContent = (
    <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.fallbackContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initialsText, { fontSize: size * 0.36 }]}>{getInitials()}</Text>
        </View>
      )}

      {/* Progress SVG Ring Overlay */}
      {isUploading && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.svgOverlay}
        >
          <Svg width={size} height={size}>
            {/* Background Track Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusVal}
              stroke={palette.gray200}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Active Animated Progress Circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radiusVal}
              stroke={colors.primaryDark}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
              fill="transparent"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
        </Animated.View>
      )}

      {/* Camera Edit Badge */}
      {showEditBadge && (
        <View style={styles.editBadge}>
          <Camera size={14} color={palette.pureWhite} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isUploading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        {avatarContent}
      </TouchableOpacity>
    );
  }

  return avatarContent;
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gray100,
    overflow: 'visible',
    ...shadows.sm,
  },
  avatarImage: {
    backgroundColor: palette.gray100,
  },
  fallbackContainer: {
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.green200,
  },
  initialsText: {
    fontFamily: fontFamily.poppins.bold,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '0deg' }],
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgCard,
    ...shadows.xs,
  },
});
