import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Screen } from '@components/layout/Screen';
import { Text } from '@components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@components/ui/Button';
import { fontFamily, layout, radius } from '@design/index';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { useAppTheme } from '../../src/theme/useAppTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const createSlides = ({ colors, palette }: AppTheme) => [
  {
    id: '1',
    title: 'Verified Workers You Can Trust',
    subtitle: 'Every worker is background-checked, ID-verified, and reviewed by real customers near you.',
    image: require('../../assets/images/verfied-worker.png'),
    color: colors.primaryTint, 
  },
  {
    id: '2',
    title: 'Book in Under 60 Seconds',
    subtitle: 'Find nearby electricians, plumbers, and cleaners. Schedule instantly or get help right now.',
    image: require('../../assets/images/book-in-under.png'),
    color: colors.warningLight,
  },
  {
    id: '3',
    title: 'Track Every Step, Live',
    subtitle: 'Watch your worker travel to you in real-time. Chat, call, or reschedule — all in one place.',
    image: require('../../assets/images/track-step.png'),
    color: palette.blue100,
  }
];

export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const SLIDES = useThemedStyles(createSlides);
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleSkip = () => {
    flatListRef.current?.scrollToIndex({ index: 2, animated: true });
  };

  const handleGetStarted = () => {
    router.push('/(auth)/phone');
  };

  const handleLogin = () => {
    router.push('/(auth)/phone');
  };

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  // Footer animation: slide up on slide 3
  const footerAnimatedStyle = useAnimatedStyle(() => {
    const isLastSlide = scrollX.value >= SCREEN_WIDTH * 1.5;
    return {
      opacity: withTiming(isLastSlide ? 1 : 0, { duration: 250 }),
      transform: [
        { translateY: withSpring(isLastSlide ? 0 : 20, { damping: 15, stiffness: 100 }) }
      ]
    };
  });

  const renderItem = ({ item, index }: { item: typeof SLIDES[number], index: number }) => {
    return (
      <View style={[styles.slide, { paddingTop: Math.max(insets.top, 24) + 64 }]}>
        <View style={[styles.illustration, { backgroundColor: item.color }]}>
          {item.image && (
            <Image 
              source={item.image} 
              style={{ width: '100%', height: '100%' }} 
              contentFit="contain" 
              transition={200}
            />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text variant="h1" color="primary" style={styles.title} accessibilityRole="header">
            {item.title}
          </Text>
          <Text variant="body1" color="muted" style={styles.subtitle}>
            {item.subtitle}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen bg={colors.bgCard} edges={['left', 'right']}>
      {/* Skip Button */}
      {currentIndex < 2 && (
        <Pressable 
          style={[styles.skipButton, { top: Math.max(insets.top, 24) + 16 }]} 
          onPress={handleSkip}
          hitSlop={12}
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <View style={styles.mainContent}>
        {/* Slider */}
        <Animated.FlatList
        ref={flatListRef as any}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        accessibilityRole="none"
      />

      {/* Dots Indicator */}
      <View style={styles.paginationContainer}>
        {SLIDES.map((_, index) => {
          const dotStyle = useAnimatedStyle(() => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];
            
            const dotWidth = interpolate(
              scrollX.value,
              inputRange,
              [6, 20, 6],
              Extrapolation.CLAMP
            );
            
            const opacity = interpolate(
              scrollX.value,
              inputRange,
              [0.3, 1, 0.3],
              Extrapolation.CLAMP
            );

            return { width: dotWidth, opacity };
          });

          return (
            <Animated.View 
              key={index} 
              style={[styles.dot, dotStyle]} 
              accessibilityLabel={`Slide ${index + 1} of 3`}
            />
          );
        })}
      </View>

      </View>

      {/* CTA Footer */}
      <View style={[styles.footerPlaceholder, { height: layout.primaryButtonH + 84 + insets.bottom }]}>
        <Animated.View style={[styles.footerContainer, footerAnimatedStyle, { paddingBottom: insets.bottom + 24 }]}>
          <Button 
            variant="primary" 
            size="lg" 
            fullWidth 
            onPress={handleGetStarted}
            label="Get Started"
            style={styles.buttonShadow}
          />
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={handleLogin} hitSlop={12} accessibilityLabel="Already have an account, log in">
              <Text style={styles.loginLink}>Log In</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  mainContent: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    maxWidth: 320,
    maxHeight: 320,
    borderRadius: 9999,
    marginBottom: 48,
    overflow: 'hidden',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    // ensure max 2 lines visually
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 26,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  footerPlaceholder: {
    width: '100%',
  },
  footerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  buttonShadow: {
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  loginLink: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
});
