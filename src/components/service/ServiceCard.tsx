import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import {
  Zap,
  Droplet,
  Wind,
  Sparkles,
  Hammer,
  Paintbrush,
  Wrench,
} from 'lucide-react-native';
import { Service } from '../../types/category.types';
import { colors, palette } from '../../design/colors';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { typography } from '../../design/typography';
import { ServiceBadge, ServiceBadgeType } from './ServiceBadge';
import { ServicePriceTag } from './ServicePriceTag';
import { AddToCartButton } from '../cart/AddToCartButton';
import { formatCategoryName, getServicePrice } from '../../utils/formatters';

interface ServiceCardProps {
  service: Service;
  index: number;
  onAdd?: () => void;
}

const CATEGORY_STYLE_MAP: Record<string, { bg: string; color: string; Icon: any }> = {
  electrician: { bg: palette.amber100, color: colors.warningMedium, Icon: Zap },
  plumber: { bg: colors.infoLight, color: colors.textInfo, Icon: Droplet },
  ac_repair: { bg: palette.sky50, color: palette.sky600, Icon: Wind },
  cleaning: { bg: colors.primaryTint, color: colors.primaryDark, Icon: Sparkles },
  carpenter: { bg: palette.orange50, color: palette.orange600, Icon: Hammer },
  painter: { bg: palette.purple50, color: palette.purple600, Icon: Paintbrush },
};

const DEFAULT_STYLE = { bg: colors.canvasGray, color: colors.textSecondary, Icon: Wrench };

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  index,
  onAdd,
}) => {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Grid sizing: 2 columns
  const cardWidth = Math.floor((SCREEN_WIDTH - 32 - 12) / 2);

  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.08); // Match shadows.sm

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 400, damping: 22 });
    shadowOpacity.value = withSpring(0);
  };

  const handlePressOut = () => {
    scale.value = withSequence(
      withSpring(1.02, { stiffness: 200, damping: 10 }),
      withSpring(1)
    );
    shadowOpacity.value = withSpring(0.08);
  };

  const handlePress = () => {
    router.push(`/service/${service.id}` as any);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
    };
  });

  const rawCatId = service?.categoryId || (service as any)?.category_id || '';
  const catStyle = CATEGORY_STYLE_MAP[rawCatId] || DEFAULT_STYLE;
  const CategoryIcon = catStyle.Icon;

  // Badge logic
  let badgeType: ServiceBadgeType | null = null;
  // Check if properties exist on service or use defaults
  const isPopular = (service as any)?.isPopular;
  const isNew = (service as any)?.isNew;
  const dealPrice = (service as any)?.dealPrice;

  if (dealPrice !== undefined && dealPrice !== null) {
    badgeType = 'deal';
  } else if (isPopular) {
    badgeType = 'popular';
  } else if (isNew) {
    badgeType = 'new';
  }

  const displayPrice = dealPrice !== undefined && dealPrice !== null ? dealPrice : getServicePrice(service, 500);

  return (
    <Animated.View
      style={[
        styles.container,
        { width: cardWidth },
        animatedStyle,
      ]}
    >
      <Pressable
        style={styles.pressable}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${service?.name || 'Service'}, priced from Rs ${displayPrice}, tap for details`}
      >
        {/* Icon Area */}
        <View style={[styles.iconArea, { backgroundColor: catStyle.bg }]}>
          <CategoryIcon
            size={32}
            color={catStyle.color}
          />

          {badgeType && (
            <ServiceBadge
              type={badgeType}
              size="xs"
              style={styles.badge}
            />
          )}
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          <Text
            style={styles.serviceName}
            numberOfLines={2}
          >
            {service?.name || 'Service'}
          </Text>

          <Text style={styles.categoryName}>
            {formatCategoryName(rawCatId)}
          </Text>

          <View style={styles.footerRow}>
            <ServicePriceTag
              amount={displayPrice}
              priceType={service.priceType}
              showFrom={true}
              size="sm"
            />

            <AddToCartButton
              serviceId={service.id}
              serviceName={service.name}
              price={displayPrice || 0}
              size="sm"
              onAdd={onAdd}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    height: 200,
    ...shadows.sm,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
  },
  iconArea: {
    height: 90,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  contentArea: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  serviceName: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  categoryName: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
});
