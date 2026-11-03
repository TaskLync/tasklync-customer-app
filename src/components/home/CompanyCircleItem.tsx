import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Building2 } from 'lucide-react-native';
import { WorkerNearby } from '../../types/worker.types';
import { companyTokens } from '../../theme/companyTokens';
import { springConfig } from '../../design/animations';
import { colors } from '../../design/colors';

interface CompanyCircleItemProps {
  company: WorkerNearby;
  onPress: (company: WorkerNearby) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CompanyCircleItem: React.FC<CompanyCircleItemProps> = ({
  company,
  onPress,
}) => {
  const [imageError, setImageError] = useState(false);
  const scale = useSharedValue(1);

  const displayName = company.businessName || company.name || 'Company';

  const handlePressIn = () => {
    scale.value = withSpring(0.92, springConfig.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, springConfig.bouncy);
  };

  const handlePress = useCallback(() => {
    onPress(company);
  }, [company, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Generate fallback initials (e.g., "FixIt Pro" -> "FP")
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const showFallback = !company.avatarUrl || imageError;

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, service company`}
      accessibilityHint="Tap to view company profile and services"
    >
      {/* Circular Logo Container */}
      <View style={styles.logoWrapper}>
        {!showFallback ? (
          <Image
            source={{ uri: company.avatarUrl! }}
            style={styles.logoImage}
            contentFit="cover"
            transition={150}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <Building2 size={20} color={companyTokens.colors.verifiedBlue} strokeWidth={2} />
            <Text style={styles.fallbackInitials}>{getInitials(displayName)}</Text>
          </View>
        )}
      </View>

      {/* Company Name Label */}
      <Text style={styles.companyName} numberOfLines={2}>
        {displayName}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: companyTokens.dimensions.homeItemWidth,
    backgroundColor: 'transparent',
  },
  logoWrapper: {
    width: companyTokens.dimensions.homeLogoSize,
    height: companyTokens.dimensions.homeLogoSize,
    borderRadius: companyTokens.dimensions.homeLogoRadius,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: companyTokens.colors.borderSubtle,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...companyTokens.shadows.logoCard,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: companyTokens.dimensions.homeLogoRadius,
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: companyTokens.colors.verifiedBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  fallbackInitials: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: companyTokens.colors.verifiedBlueDark,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  companyName: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    lineHeight: 15.5,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
    minHeight: 31, // Standardized 2-line height clearance so all items stay aligned
    paddingHorizontal: 2,
  },
});
