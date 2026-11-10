import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Zap, Wind, Droplet, Sparkles, Wrench } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolateColor } from 'react-native-reanimated';

import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { springConfig } from '../../design/animations';
import { typography } from '../../design/typography';
import { Image } from 'expo-image';
import { AddToCartButton } from '../cart/AddToCartButton';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ServiceListItemProps {
  id: string;
  name: string;
  categoryName: string;
  duration: string;
  startingPrice: number;
  currency: string;
  iconName?: string;
  imageUrl?: any;
  isHeader?: boolean;
  style?: any;
  /** Optional: the caller decides what tapping a catalogue service does. */
  onPress?: () => void;
}

export const ServiceListItem: React.FC<ServiceListItemProps> = ({
  id,
  name,
  categoryName,
  duration,
  startingPrice,
  currency,
  iconName,
  imageUrl,
  isHeader = false,
  style,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, springConfig.stiff);
    pressed.value = 1;
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, springConfig.bouncy);
    pressed.value = 0;
  };

  const handlePress = () => {
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      [colors.bgCard, colors.bgSection]
    );
    
    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      shadowOpacity: scale.value < 1 ? 0 : ((shadows.sm as any).shadowOpacity || 0.08),
      elevation: scale.value < 1 ? 0 : ((shadows.sm as any).elevation || 2),
    };
  });

  const getIcon = () => {
    if (imageUrl) {
      return (
        <Image
          source={imageUrl}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      );
    }
    switch (iconName) {
      case 'zap': return <Zap size={20} color={colors.primary} />;
      case 'wind': return <Wind size={20} color={colors.primary} />;
      case 'droplet': return <Droplet size={20} color={colors.primary} />;
      case 'sparkles': return <Sparkles size={20} color={colors.primary} />;
      default: return <Wrench size={20} color={colors.primary} />;
    }
  };

  const finalPrice = startingPrice && startingPrice > 0 ? startingPrice : 500;

  if (isHeader) {
    return (
      <View style={[styles.headerContainer, style]}>
        <View style={styles.iconAreaHeader}>
          {getIcon()}
        </View>
        <View style={styles.contentHeader}>
          <Text style={styles.nameHeader} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.durationHeader}>
            {duration}
          </Text>
        </View>
        <View style={styles.priceHeader}>
          <Text style={styles.priceLabel}>From </Text>
          <Text style={styles.priceValue}>{currency} {finalPrice}</Text>
        </View>
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle, style]}
    >
      <View style={styles.mediaArea}>
        {getIcon()}
      </View>
      
      <View style={styles.detailsArea}>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
        </View>
        
        <View style={styles.priceRow}>
          <View style={styles.priceTextContainer}>
            <Text style={styles.priceLabel}>From</Text>
            <Text style={styles.priceValue}>{currency} {finalPrice}</Text>
          </View>
          <AddToCartButton
            serviceId={id}
            serviceName={name}
            price={finalPrice}
            size="sm"
          />
        </View>
      </View>
    </AnimatedPressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: radius.lg,
    padding: 0,
    marginBottom: 16,
    ...shadows.sm,
    flexDirection: 'column',
  },
  mediaArea: {
    width: '100%',
    height: 170,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  detailsArea: {
    flex: 1,
    padding: 12,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    marginBottom: 8,
  },
  name: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    minHeight: 40,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    width: '100%',
  },
  priceTextContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  priceValue: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: 14,
    color: colors.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconAreaHeader: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contentHeader: {
    flex: 1,
    justifyContent: 'center',
  },
  nameHeader: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  durationHeader: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});
