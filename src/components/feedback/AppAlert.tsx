import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Info } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * Tasklync alert: one minimal dialog used everywhere instead of the native `Alert.alert`.
 * `showAlert` has the same signature as `Alert.alert`, so it can be called from components,
 * hooks and utilities. `<AppAlertHost />` is mounted once in AppProviders.
 */

export type AppAlertType = 'error' | 'success' | 'warning' | 'info' | 'confirm';

export interface AppAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface AppAlertOptions {
  /** Defaults to an inferred type (see `inferType`). */
  type?: AppAlertType;
}

interface AlertItem {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  type: AppAlertType;
}

const ERROR_RE = /error|fail|unable|couldn'?t|could not|invalid|unsupported|denied|cannot|can't/i;
const SUCCESS_RE = /success|received|submitted|cancelled|declined|removed|completed|confirmed|saved|updated/i;
const WARNING_RE = /required|unavailable|permission|limit|off|notice|conflict|expired/i;

function inferType(title: string, buttons: AppAlertButton[]): AppAlertType {
  if (buttons.length > 1) return 'confirm';
  if (ERROR_RE.test(title)) return 'error';
  if (SUCCESS_RE.test(title)) return 'success';
  if (WARNING_RE.test(title)) return 'warning';
  return 'info';
}

// Module-level queue: alerts raised back to back are shown one after another.
let queue: AlertItem[] = [];
let listener: ((item: AlertItem | null) => void) | null = null;
let showing = false;

function pump() {
  if (showing || !listener) return;
  const next = queue.shift();
  if (!next) return;
  showing = true;
  listener(next);
}

export function showAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions
): void {
  const resolved = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  queue.push({ title, message, buttons: resolved, type: options?.type ?? inferType(title, resolved) });
  pump();
}

export function AppAlertHost() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [item, setItem] = useState<AlertItem | null>(null);
  const [visible, setVisible] = useState(false);
  const busy = useRef(false); // guards double taps / duplicate submissions
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listener = (next) => {
      busy.current = false;
      setItem(next);
      setVisible(true);
    };
    pump();
    return () => {
      listener = null;
      showing = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  const dismiss = useCallback(
    (button?: AppAlertButton) => {
      if (busy.current) return;
      busy.current = true;
      Animated.timing(anim, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
        setVisible(false);
        setItem(null);
        showing = false;
        // Run the callback after the dialog is gone, then show the next queued alert.
        try {
          void button?.onPress?.();
        } finally {
          pump();
        }
      });
    },
    [anim]
  );

  if (!item) return null;

  const { type, buttons } = item;
  const tone =
    type === 'error'
      ? colors.danger
      : type === 'success'
        ? colors.success
        : type === 'warning'
          ? colors.warning
          : colors.textSecondary;
  const Icon =
    type === 'error' ? AlertCircle : type === 'success' ? CheckCircle2 : type === 'warning' ? AlertTriangle : type === 'confirm' ? HelpCircle : Info;

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const stacked = buttons.length > 2;
  const cardWidth = Math.min(width - 48, 340);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => cancelButton && dismiss(cancelButton)}
    >
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Animated.View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[
            styles.card,
            { width: cardWidth, opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
          ]}
        >
          <View style={styles.iconWrap}>
            <Icon size={22} color={tone} strokeWidth={2} />
          </View>
          <Text style={styles.title}>{item.title}</Text>
          {!!item.message && <Text style={styles.message}>{item.message}</Text>}

          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {buttons.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDestructive = b.style === 'destructive';
              // The last non-cancel button is the primary action; with a single button it is always primary.
              const isPrimary = !isCancel && (buttons.length === 1 || i === buttons.length - 1 || isDestructive);
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => dismiss(b)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    !stacked && buttons.length > 1 && styles.buttonFlex,
                    isPrimary
                      ? [styles.buttonPrimary, isDestructive && { backgroundColor: colors.danger }]
                      : styles.buttonSecondary,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.buttonText, isPrimary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}
                    numberOfLines={2}
                  >
                    {b.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.overlay,
      paddingHorizontal: 24,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 16,
      alignItems: 'center',
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.bgSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    message: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    actions: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    actionsStacked: { flexDirection: 'column' },
    button: {
      minHeight: 46,
      borderRadius: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    buttonFlex: { flex: 1 },
    buttonPrimary: { backgroundColor: colors.primaryDark },
    buttonSecondary: { backgroundColor: colors.bgSubtle, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    buttonText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
    buttonTextPrimary: { color: '#FFFFFF' },
    buttonTextSecondary: { color: colors.textPrimary },
    pressed: { opacity: 0.8 },
  });
