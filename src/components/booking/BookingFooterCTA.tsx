import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface BookingFooterCTAProps {
  label: string;
  subtext?: string | null;
  enabled: boolean;
  loading?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BookingFooterCTA: React.FC<BookingFooterCTAProps> = ({
  label,
  subtext,
  enabled,
  loading = false,
  onPress,
  accessibilityLabel,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const isInteractive = enabled && !loading;
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!isInteractive) return;
    scale.value = withTiming(0.98, { duration: 80 });
  };

  const handlePressOut = () => {
    if (!isInteractive) return;
    scale.value = withTiming(1.0, { duration: 80 });
  };

  const handlePress = () => {
    if (!isInteractive) return;
    onPress();
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bottomPadding = insets.bottom > 0 ? insets.bottom + 14 : 20;

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.innerContainer}>
        {/* Optional Subtext / Summary info */}
        {subtext !== undefined && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {subtext || 'Select details to proceed'}
            </Text>
          </View>
        )}

        {/* Primary Action Button */}
        <AnimatedPressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={!isInteractive}
          style={[
            styles.button,
            subtext === undefined && styles.fullWidthButton,
            isInteractive ? styles.buttonEnabled : styles.buttonDisabled,
            animatedButtonStyle,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isInteractive, busy: loading }}
          accessibilityLabel={accessibilityLabel || label}
        >
          {loading ? (
            <ActivityIndicator size="small" color={palette.pureWhite} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                isInteractive ? styles.textEnabled : styles.textDisabled,
              ]}
            >
              {label}
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    zIndex: 100,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryContainer: {
    flex: 1,
    marginRight: 12,
  },
  summaryLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 164,
    minHeight: 52,
  },
  fullWidthButton: {
    flex: 1,
  },
  buttonEnabled: {
    backgroundColor: colors.primaryDark,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: palette.gray100,
  },
  buttonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 15,
  },
  textEnabled: {
    color: palette.pureWhite,
  },
  textDisabled: {
    color: palette.gray400,
  },
});
