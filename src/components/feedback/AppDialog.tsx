import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  HelpCircleIcon,
  InfoIcon,
  WarningIcon,
} from '../ui/Icon/icons';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * Tasklync dialog: the one centred dialog shell for the whole app.
 *
 * Layout (top to bottom): optional icon, title, message, optional custom content, actions.
 *   - Centred in the safe viewport (status/navigation bars excluded), width min(screen - 48, 360).
 *   - Elevated surface (white in Light, lifted charcoal in Dark), radius 20, no border or shadow.
 *   - Actions: 1 action is full width; 2 short actions sit side by side (secondary left, primary right);
 *     long labels or 3+ actions stack full width with the primary on top.
 *   - Fade + slight scale in (160ms), quick fade out. No bounce.
 *
 * Bottom sheets stay bottom sheets: use this only for centred alerts and confirmations.
 */

export type DialogTone = 'info' | 'success' | 'warning' | 'error' | 'confirm';
export type DialogActionVariant = 'primary' | 'secondary' | 'destructive';

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: DialogActionVariant | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  accessibilityLabel?: string | undefined;
}

export interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: React.ReactNode | undefined;
  /** Semantic tone: picks the default icon and its colour. */
  tone?: DialogTone | undefined;
  /** Custom icon (overrides the tone icon). Pass `null` to show no icon. */
  icon?: React.ReactNode | null | undefined;
  /** Extra content between the message and the actions (e.g. a text input). */
  children?: React.ReactNode | undefined;
  actions: DialogAction[];
  /** Android back button / programmatic close. Omit to make back do nothing (explicit choice required). */
  onRequestClose?: (() => void) | undefined;
  /** Tapping the dimmed backdrop closes the dialog. Off by default; never enable for destructive confirmations. */
  dismissOnBackdropPress?: boolean | undefined;
  /** Force a button layout instead of the automatic one. */
  actionsLayout?: 'auto' | 'row' | 'stack' | undefined;
  /** Called once the close animation has finished and the dialog is gone. */
  onExited?: (() => void) | undefined;
  testID?: string | undefined;
}

const SHORT_LABEL = 14;

export function AppDialog({
  visible,
  title,
  message,
  tone = 'info',
  icon,
  children,
  actions,
  onRequestClose,
  dismissOnBackdropPress = false,
  actionsLayout = 'auto',
  onExited,
  testID,
}: AppDialogProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  // Stay mounted while the close animation runs.
  const [mounted, setMounted] = useState(visible);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
        setMounted(false);
        onExitedRef.current?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, anim]);

  const toneColor =
    tone === 'error' ? colors.textDanger
      : tone === 'success' ? colors.primaryDark
        : tone === 'warning' ? colors.warningMedium
          : colors.textSecondary;
  const ToneIcon =
    tone === 'error' ? AlertCircleIcon
      : tone === 'success' ? CheckCircleIcon
        : tone === 'warning' ? WarningIcon
          : tone === 'confirm' ? HelpCircleIcon
            : InfoIcon;
  const iconNode = icon === null ? null : icon ?? <ToneIcon size={22} color={toneColor} strokeWidth={2} />;

  const stacked =
    actionsLayout === 'stack' ||
    (actionsLayout === 'auto' && (actions.length > 2 || actions.some((a) => a.label.length > SHORT_LABEL)));
  const row = !stacked && actions.length > 1;
  // Row: secondary actions first (left), primary/destructive last (right). Stack: primary first (top).
  const ordered = row
    ? [...actions].sort((a, b) => rank(a) - rank(b))
    : [...actions].sort((a, b) => rank(b) - rank(a));
  const anyLoading = actions.some((a) => a.loading);

  const cardWidth = Math.min(width - 48, 360);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (!anyLoading) onRequestClose?.();
      }}
    >
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdropPress && !anyLoading ? onRequestClose : undefined}
          accessible={false}
          importantForAccessibility="no"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.viewport, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
          pointerEvents="box-none"
        >
          <Animated.View
            testID={testID}
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={[
              styles.card,
              {
                width: cardWidth,
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
              },
            ]}
          >
            {iconNode ? <View style={styles.iconWrap}>{iconNode}</View> : null}

            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              {title}
            </Text>
            {typeof message === 'string' ? (
              message ? (
                <Text style={styles.message} maxFontSizeMultiplier={1.3}>
                  {message}
                </Text>
              ) : null
            ) : message ? (
              <View style={styles.messageNode}>{message}</View>
            ) : null}

            {children ? <View style={styles.content}>{children}</View> : null}

            <View style={[styles.actions, row ? styles.actionsRow : styles.actionsStack]}>
              {ordered.map((a, i) => (
                <DialogButton key={`${a.label}-${i}`} action={a} flex={row} disabled={a.disabled || (anyLoading && !a.loading)} />
              ))}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

function rank(a: DialogAction): number {
  return a.variant === 'primary' || a.variant === 'destructive' ? 1 : 0;
}

/** Shared dialog button: primary (brand), secondary (neutral), destructive (red). 48px, radius 12. */
export function DialogButton({
  action,
  flex = false,
  disabled = false,
}: {
  action: DialogAction;
  flex?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const variant = action.variant ?? 'secondary';
  const isFilled = variant !== 'secondary';
  const inactive = disabled || action.loading;

  return (
    <Pressable
      onPress={action.onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityState={{ disabled: !!inactive, busy: !!action.loading }}
      style={({ pressed }) => [
        styles.button,
        flex && styles.buttonFlex,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'destructive' && styles.buttonDestructive,
        variant === 'secondary' && styles.buttonSecondary,
        pressed && !inactive && (isFilled ? styles.buttonFilledPressed : styles.buttonSecondaryPressed),
        disabled && !action.loading && styles.buttonDisabled,
      ]}
    >
      {action.loading ? (
        <ActivityIndicator size="small" color={isFilled ? colors.pureWhite : colors.textSecondary} />
      ) : (
        <Text
          style={[styles.buttonText, isFilled ? styles.buttonTextFilled : styles.buttonTextSecondary]}
          numberOfLines={2}
          maxFontSizeMultiplier={1.3}
        >
          {action.label}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: palette.overlay,
    },
    viewport: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: {
      maxWidth: 360,
      backgroundColor: colors.modalBackground,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 20,
      alignItems: 'center',
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.bgHover,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 17,
      lineHeight: 23,
      letterSpacing: -0.2,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    message: {
      marginTop: 6,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    messageNode: {
      marginTop: 6,
      alignSelf: 'stretch',
    },
    content: {
      alignSelf: 'stretch',
      marginTop: 14,
    },
    actions: {
      alignSelf: 'stretch',
      marginTop: 22,
      gap: 10,
    },
    actionsRow: {
      flexDirection: 'row',
    },
    actionsStack: {
      flexDirection: 'column',
    },
    button: {
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    buttonFlex: {
      flex: 1,
    },
    buttonPrimary: {
      backgroundColor: colors.buttonPrimary,
    },
    buttonDestructive: {
      backgroundColor: colors.buttonDestructive,
    },
    buttonSecondary: {
      backgroundColor: colors.bgHover,
    },
    buttonFilledPressed: {
      opacity: 0.88,
    },
    buttonSecondaryPressed: {
      backgroundColor: colors.buttonSecondaryPressed,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontFamily: 'PlusJakartaSans-SemiBold',
      fontSize: 15,
      textAlign: 'center',
    },
    buttonTextFilled: {
      color: colors.pureWhite,
    },
    buttonTextSecondary: {
      color: colors.textPrimary,
    },
  });
