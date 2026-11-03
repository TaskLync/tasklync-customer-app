import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { springConfig } from '../../design/animations';
import { fontFamily } from '../../design/typography';
import { palette, colors } from '../../design/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HERO_IMAGE = require('../../../assets/images/hero-images/hero-image.jpeg');
const BANNER_HEIGHT = 156;

export const BannerCarousel = () => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // Responsive, deterministic banner layout (16px horizontal margins)
  const bannerWidth = Math.max(screenWidth - 32, 280);
  const contentMaxWidth = Math.min(Math.round(bannerWidth * 0.62), 240);

  // CTA button micro-interaction spring animation
  const ctaScale = useSharedValue(1);

  const handlePressIn = () => {
    ctaScale.value = withSpring(0.95, springConfig.stiff);
  };

  const handlePressOut = () => {
    ctaScale.value = withSpring(1.0, springConfig.bouncy);
  };

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const handleCtaPress = useCallback(() => {
    router.push('/(tabs)/explore' as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={[styles.bannerWrapper, { width: bannerWidth }]}>
        <View style={styles.bannerContainer}>
          {/* Layer 0: Background Promotional Image */}
          {/* Uses absolute positioning to serve as the backdrop while preserving composition */}
          <Image
            source={HERO_IMAGE}
            style={styles.heroImage}
            contentFit="cover"
            contentPosition="right center"
            transition={Platform.select({ web: 200, default: 0 })}
            priority="high"
            accessible={false}
          />

          {/* Layer 1: Gradient Scrim Overlay */}
          {/* Dark scrim anchored on the left to guarantee WCAG AAA text contrast, */}
          {/* tapering smoothly to full transparency to reveal handyman and brand artwork on the right */}
          <LinearGradient
            colors={[
              'rgba(6, 20, 14, 0.94)',
              'rgba(6, 20, 14, 0.82)',
              'rgba(6, 20, 14, 0.45)',
              'rgba(6, 20, 14, 0.0)',
            ]}
            locations={[0, 0.42, 0.64, 0.82]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientOverlay}
            pointerEvents="none"
          />

          {/* Layer 2: Content Layer */}
          {/* collapsable={false} prevents view flattening in Fabric (New Architecture) on Android. */}
          {/* elevation + zIndex guarantees rendering above the background image across Android, iOS & Web. */}
          <View
            style={styles.contentLayer}
            collapsable={false}
          >
            <View style={[styles.textBlock, { maxWidth: contentMaxWidth }]}>
              {/* Subtle Promotional Badge */}
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>SPECIAL OFFER</Text>
              </View>

              {/* Promotional Headline */}
              <Text style={styles.headline}>
                Get <Text style={styles.highlightText}>10% Off</Text>{'\n'}on Your First Booking
              </Text>

              {/* Supporting Promotional Text */}
              <Text style={styles.supportingText} numberOfLines={1}>
                Quality service, right at your doorstep.
              </Text>
            </View>

            {/* Premium "Book Now" CTA Pill */}
            <AnimatedPressable
              onPress={handleCtaPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={[styles.ctaPill, ctaAnimatedStyle]}
              accessibilityRole="button"
              accessibilityLabel="Book Now - Explore services"
              accessibilityHint="Navigates to explore services page"
            >
              <Text style={styles.ctaPillText}>Book Now</Text>
              <ArrowRight size={13} color={palette.green900} strokeWidth={2.4} style={styles.arrowIcon} />
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  bannerWrapper: {
    height: BANNER_HEIGHT,
    borderRadius: radius['2xl'],
    ...shadows.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerContainer: {
    width: '100%',
    height: '100%',
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: palette.slate900,
  },
  heroImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  contentLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
    elevation: Platform.OS === 'android' ? 2 : undefined,
  },
  textBlock: {
    alignItems: 'flex-start',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.32)',
    borderRadius: radius.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 5,
  },
  promoBadgeText: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 9,
    lineHeight: 12,
    color: palette.green400,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 16,
    lineHeight: 21,
    color: palette.white,
    letterSpacing: -0.2,
  },
  highlightText: {
    color: palette.green400,
    fontFamily: fontFamily.poppins.bold,
  },
  supportingText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11.5,
    lineHeight: 15,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 4,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
      },
      // Android inherits contentLayer elevation: 2 without clipping against overflow: 'hidden'
    }),
  },
  ctaPillText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: palette.green900,
    letterSpacing: 0.1,
  },
  arrowIcon: {
    marginLeft: 5,
  },
});

