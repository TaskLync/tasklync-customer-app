import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';

import { Screen } from '@components/layout/Screen';
import { Text } from '@components/ui/Text';
import { TextInput } from '@components/ui/Input/TextInput';
import { Button } from '@components/ui/Button';
import { colors, fontFamily, palette } from '@design/index';
import { useUpdateName } from '@hooks/useAuth';

export default function NameScreen() {
  const [name, setName] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { updateName, isLoading, error } = useUpdateName();
  const insets = useSafeAreaInsets();

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 2;
  const showCount = trimmedName.length > 30;
  const isWarning = trimmedName.length >= 45;

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
      buttonScale.value = withSpring(1.02, { damping: 10, stiffness: 400 }, (finished) => {
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
      scrollViewRef.current?.scrollTo({ y: 30, animated: true });
    }, Platform.OS === 'ios' ? 60 : 120);
  }, []);

  const handleContinue = () => {
    if (isValid && !isLoading) {
      Keyboard.dismiss();
      updateName(trimmedName);
    }
  };

  // 12px ergonomic clearance above soft keyboard; safe-area clearance when resting at screen bottom
  const activeBottomPadding = isKeyboardVisible
    ? 12
    : insets.bottom > 0
    ? insets.bottom + 14
    : 20;

  return (
    <Screen bg={colors.bgCard} statusBarStyle="dark-content" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top > 0 ? 16 : 28, 20) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>👋</Text>
          </View>

          <Text variant="h1" color="primary" style={styles.title}>
            What's your name?
          </Text>

          <Text variant="body1" color="muted" style={styles.subtitle}>
            So workers know who they're meeting
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              label="Your name"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              autoCapitalize="words"
              maxLength={50}
              onSubmitEditing={handleContinue}
              onFocus={handleInputFocus}
              error={error ?? ''}
              accessibilityLabel="Enter your name"
              accessibilityHint="We'll use this to introduce you to workers"
            />
            {showCount && (
              <Text style={[styles.charCount, isWarning && styles.charCountWarning]}>
                {trimmedName.length} / 50
              </Text>
            )}
          </View>
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
              label="Let's go"
              icon={ArrowRight}
              iconPosition="right"
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emojiContainer: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    lineHeight: 58,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  charCount: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: palette.warning,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
