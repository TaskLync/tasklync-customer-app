import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Phone, ChevronLeft } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { Screen } from '@components/layout/Screen';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { PhoneInput } from '@components/ui/Input/PhoneInput';
import { IconButton } from '@components/ui/Button/IconButton';
import { fontFamily } from '@design/index';
import { useSendOtp } from '@hooks/useAuth';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';

export default function PhoneScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { sendOtp, isLoading, error } = useSendOtp();

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValid = phone.length >= 10;
  
  // Animation for valid state
  const buttonScale = useSharedValue(1);
  const buttonColor = useSharedValue(colors.primaryLight); 

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // Listen to keyboard lifecycle for responsive bottom clearance
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isValid) {
      buttonScale.value = withSpring(1.03, { damping: 10, stiffness: 400 }, (finished) => {
        if (finished) {
          buttonScale.value = withSpring(1);
        }
      });
      buttonColor.value = withTiming(colors.primary, { duration: 200 });
    } else {
      buttonColor.value = withTiming(colors.primaryLight, { duration: 200 });
    }
  }, [isValid]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleInputFocus = useCallback(() => {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 40, animated: true });
    }, Platform.OS === 'ios' ? 60 : 120);
  }, []);

  const handleContinue = () => {
    if (isValid && !isLoading) {
      Keyboard.dismiss();
      sendOtp(phone);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      if (Platform.OS !== 'web') {
        await WebBrowser.openBrowserAsync(url);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  // 12px ergonomic clearance above soft keyboard; safe-area clearance when resting at screen bottom
  const activeBottomPadding = isKeyboardVisible
    ? 12
    : insets.bottom > 0
    ? insets.bottom + 14
    : 20;

  return (
    <Screen bg={colors.bgCard} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <IconButton
            icon={ChevronLeft}
            iconSize={24}
            color={colors.textPrimary}
            onPress={handleGoBack}
            accessibilityLabel="Go back to welcome screen"
            bg="transparent"
            style={styles.backButton}
          />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.iconContainer}>
            <Phone size={28} color={colors.primary} />
          </View>

          <Text variant="h1" color="primary" style={styles.title}>
            Enter your{'\n'}phone number
          </Text>

          <Text variant="body1" color="muted" style={styles.subtitle}>
            We'll send a verification code to confirm it's you
          </Text>

          <View style={styles.inputContainer}>
            <PhoneInput
              value={phone}
              onChangeText={setPhone}
              error={error ?? ''}
              onSubmitEditing={handleContinue}
              onFocus={handleInputFocus}
            />
          </View>

          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.legalLink}
              onPress={() => handleOpenLink('https://tasklync.pk/terms')}
              accessibilityRole="link"
              accessibilityLabel="Terms of Service"
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.legalLink}
              onPress={() => handleOpenLink('https://tasklync.pk/privacy')}
              accessibilityRole="link"
              accessibilityLabel="Privacy Policy"
            >
              Privacy Policy
            </Text>
          </Text>
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: activeBottomPadding }]}>
          <Animated.View style={animatedButtonStyle}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isValid}
              loading={isLoading}
              onPress={handleContinue}
              style={{ backgroundColor: isValid ? colors.primary : colors.primaryLight }}
              label="Continue"
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 28,
  },
  inputContainer: {
    marginBottom: 20,
  },
  legalText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  legalLink: {
    color: colors.primary,
    fontFamily: fontFamily.jakarta.medium,
    textDecorationLine: 'underline',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
