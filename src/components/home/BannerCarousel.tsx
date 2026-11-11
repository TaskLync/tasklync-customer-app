import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { BookNowButton } from '../ui/Button/BookNowButton';

const HERO_IMAGE = require('../../../assets/images/hero-images/hero-image.jpeg');
const BANNER_HEIGHT = 156;

const SCRIM_LIGHT_MODE = [
  'rgba(6, 20, 14, 0.94)',
  'rgba(6, 20, 14, 0.82)',
  'rgba(6, 20, 14, 0.45)',
  'rgba(6, 20, 14, 0.0)',
] as const;
const SCRIM_DARK_MODE = [
  'rgba(8, 28, 19, 0.88)',
  'rgba(8, 28, 19, 0.7)',
  'rgba(8, 28, 19, 0.28)',
  'rgba(8, 28, 19, 0.0)',
] as const;

export const BannerCarousel = () => {
  const { isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // Responsive, deterministic banner layout (16px horizontal margins)
  const bannerWidth = Math.max(screenWidth - 32, 280);
  const contentMaxWidth = Math.min(Math.round(bannerWidth * 0.62), 240);

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
          {/* Dark mode: a lighter, shorter scrim lets the artwork read against the dark screen while the
              text column stays well above 4.5:1. Light mode keeps the original scrim untouched. */}
          <LinearGradient
            colors={isDark ? SCRIM_DARK_MODE : SCRIM_LIGHT_MODE}
            locations={isDark ? [0, 0.38, 0.6, 0.8] : [0, 0.42, 0.64, 0.82]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientOverlay}
            pointerEvents="none"
          />

          {/* Dark mode only: hairline edge to separate the banner from the dark surface */}
          {isDark ? <View style={styles.darkEdge} pointerEvents="none" /> : null}

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
            <BookNowButton
              variant="onDark"
              showArrow
              onPress={handleCtaPress}
              accessibilityLabel="Book Now - Explore services"
              accessibilityHint="Navigates to explore services page"
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette, isDark }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  bannerWrapper: {
    height: BANNER_HEIGHT,
    borderRadius: radius['2xl'],
    ...shadows.md,
    shadowColor: colors.black,
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
    backgroundColor: '#06140E',
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
  darkEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    zIndex: 3,
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
    backgroundColor: isDark ? 'rgba(74, 222, 128, 0.24)' : 'rgba(74, 222, 128, 0.16)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(74, 222, 128, 0.5)' : 'rgba(74, 222, 128, 0.32)',
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
    color: palette.pureWhite,
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
});

