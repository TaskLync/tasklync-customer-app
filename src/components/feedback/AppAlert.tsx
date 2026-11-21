import { useCallback, useEffect, useRef, useState } from 'react';
import { AppDialog, type DialogAction } from './AppDialog';

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
  message?: string | undefined;
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
  const [item, setItem] = useState<AlertItem | null>(null);
  const [visible, setVisible] = useState(false);
  const busy = useRef(false); // guards double taps / duplicate submissions
  const pending = useRef<AppAlertButton | undefined>(undefined);

  useEffect(() => {
    listener = (next) => {
      busy.current = false;
      pending.current = undefined;
      setItem(next);
      setVisible(true);
    };
    pump();
    return () => {
      listener = null;
      showing = false;
    };
  }, []);

  const dismiss = useCallback((button?: AppAlertButton) => {
    if (busy.current) return;
    busy.current = true;
    pending.current = button;
    setVisible(false); // AppDialog fades out, then calls handleExited
  }, []);

  // Run the callback only after the dialog is gone, then show the next queued alert.
  const handleExited = useCallback(() => {
    const button = pending.current;
    pending.current = undefined;
    setItem(null);
    showing = false;
    try {
      void button?.onPress?.();
    } finally {
      pump();
    }
  }, []);

  if (!item) return null;

  const { type, buttons } = item;
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  // Primary = the single button, or the last non-cancel button. Destructive keeps its red styling.
  const lastNonCancel = [...buttons].reverse().find((b) => b.style !== 'cancel');
  const actions: DialogAction[] = buttons.map((b) => ({
    label: b.text || 'OK',
    onPress: () => dismiss(b),
    variant:
      b.style === 'destructive'
        ? 'destructive'
        : buttons.length === 1 || b === lastNonCancel
          ? 'primary'
          : 'secondary',
  }));

  return (
    <AppDialog
      visible={visible}
      title={item.title}
      message={item.message}
      tone={type}
      actions={actions}
      // Android back = the explicit cancel choice when there is one (never an implicit confirm).
      onRequestClose={cancelButton ? () => dismiss(cancelButton) : undefined}
      onExited={handleExited}
    />
  );
}
