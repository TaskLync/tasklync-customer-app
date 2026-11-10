import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, CloudOff, UserX } from 'lucide-react-native';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import type { BookingFailureKind } from '../../utils/availabilityEvents';

export type BookingIssueKind = Exclude<BookingFailureKind, 'other'>;

export interface BookingIssueSheetProps {
  visible: boolean;
  kind: BookingIssueKind;
  /** Backend reason (SLOT_TAKEN / SLOT_HELD / ...). Only used to pick accurate wording. */
  reason?: string | null | undefined;
  /** Attempt reference, shown so customer support can find this exact attempt. */
  attemptRef?: string | null | undefined;
  onPrimary: () => void;
  onSecondary?: (() => void) | undefined;
  onDismiss: () => void;
  primaryLoading?: boolean;
}

interface Copy {
  title: string;
  body: string;
  primary: string;
  secondary?: string;
}

/**
 * Copy is chosen ONLY from what the backend verified. "Another customer has booked this time" is
 * shown exclusively for a verified conflict; a network/server failure never claims that.
 */
export function bookingIssueCopy(kind: BookingIssueKind, reason?: string | null): Copy {
  switch (kind) {
    case 'slot_taken':
      return {
        title: 'This time slot is no longer available',
        body:
          reason === 'SLOT_HELD'
            ? "Another customer is booking this time right now. Your booking hasn't been confirmed. Please choose another available time."
            : "Another customer has booked this time. Your booking hasn't been confirmed. Please choose another available time.",
        primary: 'Choose Another Time',
        secondary: 'Refresh Availability',
      };
    case 'time_unavailable':
      return {
        title: "This time isn't available",
        body: "The professional isn't available at this time. Your booking hasn't been confirmed. Please choose another available time.",
        primary: 'Choose Another Time',
        secondary: 'Refresh Availability',
      };
    case 'worker_unavailable':
      return {
        title: 'Not taking bookings right now',
        body: "This professional isn't accepting new bookings at the moment. Your booking hasn't been confirmed and you haven't been charged.",
        primary: 'Find Another Professional',
        secondary: 'Not now',
      };
    case 'retryable':
    default:
      return {
        title: 'Unable to confirm your booking',
        body: "We couldn't complete the booking right now. Your selected time and booking details are saved. Please try again.",
        primary: 'Try Again',
        secondary: 'Not now',
      };
  }
}

export const BookingIssueSheet: React.FC<BookingIssueSheetProps> = ({
  visible,
  kind,
  reason,
  attemptRef,
  onPrimary,
  onSecondary,
  onDismiss,
  primaryLoading = false,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const copy = bookingIssueCopy(kind, reason);
  const Icon = kind === 'retryable' ? CloudOff : kind === 'worker_unavailable' ? UserX : CalendarClock;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss" />
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(220)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={styles.grabber} />

          <View style={styles.iconCircle}>
            <Icon size={24} color={kind === 'retryable' ? colors.textSecondary : palette.amberDark} strokeWidth={2} />
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={1.3}>{copy.title}</Text>
          <Text style={styles.body} maxFontSizeMultiplier={1.3}>{copy.body}</Text>

          {attemptRef ? (
            <Text style={styles.reference} selectable maxFontSizeMultiplier={1.2}>
              Reference: {attemptRef}
            </Text>
          ) : null}

          <Pressable
            onPress={onPrimary}
            disabled={primaryLoading}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={copy.primary}
          >
            {primaryLoading ? (
              <ActivityIndicator color={palette.pureWhite} />
            ) : (
              <Text style={styles.primaryText}>{copy.primary}</Text>
            )}
          </Pressable>

          {copy.secondary ? (
            <Pressable
              onPress={onSecondary ?? onDismiss}
              disabled={primaryLoading}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={copy.secondary}
            >
              <Text style={styles.secondaryText}>{copy.secondary}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.40)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: colors.bottomSheetBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    alignItems: 'center',
    ...shadows.lg,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  body: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  reference: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: fontSize.body2 + 1,
    color: palette.pureWhite,
  },
  secondaryBtn: {
    width: '100%',
    height: 48,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2 + 1,
    color: colors.primaryDark,
  },
  pressed: {
    opacity: 0.85,
  },
});
