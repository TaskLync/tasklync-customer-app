import { FC, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ShoppingBag, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../../store/cart.store';
import { useCartTotals } from '../../hooks/useCartTotals';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface FloatingCartBarProps {
  bottomOffset?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FloatingCartBar: FC<FloatingCartBarProps> = ({
  bottomOffset,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const worker = useCartStore((state) => state.worker);
  const { subtotal, itemCount } = useCartTotals();

  // Minimal opacity + subtle 10px slide
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const scale = useSharedValue(1);

  const hasItems = itemCount > 0;

  useEffect(() => {
    if (hasItems) {
      opacity.value = withTiming(1, { duration: 150, easing: Easing.ease });
      translateY.value = withTiming(0, { duration: 150, easing: Easing.ease });
    } else {
      opacity.value = withTiming(0, { duration: 120, easing: Easing.ease });
      translateY.value = withTiming(10, { duration: 120, easing: Easing.ease });
    }
  }, [hasItems, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!hasItems) {
    return null;
  }

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 80 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1.0, { duration: 80 });
  };

  const handleOpenCart = () => {
    router.push('/cart' as any);
  };

  // Default positioning: elevation above bottom tabs if not passed
  const calculatedBottom = bottomOffset !== undefined
    ? bottomOffset
    : (insets.bottom > 0 ? insets.bottom + 90 : 100);

  const formattedSubtotal = `Rs. ${subtotal.toLocaleString()}`;

  return (
    <Animated.View style={[styles.floatingWrapper, { bottom: calculatedBottom }, animatedStyle]}>
      <AnimatedPressable
        style={styles.cartBar}
        onPress={handleOpenCart}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${itemCount} items, total ${formattedSubtotal}`}
      >
        {/* Left side: Item count pill & subtotal */}
        <View style={styles.leftInfo}>
          <View style={styles.countPill}>
            <ShoppingBag size={14} color={colors.textOnGreen} />
            <Text style={styles.countText}>{itemCount}</Text>
          </View>

          <View style={styles.textColumn}>
            <Text style={styles.subtotalText}>{formattedSubtotal}</Text>
            {worker?.name && (
              <Text style={styles.workerSubtext} numberOfLines={1}>
                {worker.name}
              </Text>
            )}
          </View>
        </View>

        {/* Right side: View Cart CTA */}
        <View style={styles.rightAction}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <View style={styles.arrowCircle}>
            <ArrowRight size={14} color={colors.primaryDark} />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  cartBar: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  countText: {
    fontFamily: typography.fontFamily.inter.bold, // Inter font for numbers
    fontSize: typography.fontSize.caption,
    color: colors.textOnGreen,
  },
  textColumn: {
    justifyContent: 'center',
  },
  subtotalText: {
    fontFamily: typography.fontFamily.inter.bold, // Inter font for price number
    fontSize: typography.fontSize.body2,
    color: colors.textOnGreen,
  },
  workerSubtext: {
    fontFamily: typography.fontFamily.jakarta.medium, // Plus Jakarta Sans for helper text
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    maxWidth: 130,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewCartText: {
    fontFamily: typography.fontFamily.poppins.bold, // Poppins font for CTA label
    fontSize: typography.fontSize.caption,
    color: colors.textOnGreen,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
