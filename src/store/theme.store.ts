import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import type { ThemeMode } from '../design/colors';

/**
 * Theme preference + resolved scheme: the single source of truth for light/dark.
 *
 *   preference 'system' (default)  follow the device, live
 *   preference 'light' | 'dark'    explicit override
 *
 * The preference is pushed to the OS with Appearance.setColorScheme, so everything native
 * (status bar, keyboard, system dialogs, date pickers, Android nav bar contrast) agrees with the JS theme.
 * The stored value is read synchronously at import time, before the first render, so the first frame is
 * already in the right theme (no light flash for dark users).
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const storage = createMMKV({ id: 'tasklync_theme' });
const KEY = 'preference';

const readPreference = (): ThemePreference => {
  try {
    const v = storage.getString(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

const applyToOs = (pref: ThemePreference) => {
  try {
    Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
  } catch {
    /* older runtimes: the JS theme still works */
  }
};

const resolve = (pref: ThemePreference): ThemeMode =>
  pref === 'system' ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') : pref;

const initialPreference = readPreference();
applyToOs(initialPreference);

interface ThemeState {
  preference: ThemePreference;
  scheme: ThemeMode;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: initialPreference,
  scheme: resolve(initialPreference),
  setPreference: (pref) => {
    try {
      storage.set(KEY, pref);
    } catch {
      /* non-fatal: applies for this session */
    }
    applyToOs(pref);
    set({ preference: pref, scheme: resolve(pref) });
  },
}));

// One listener for the whole app: the device appearance changed while running.
Appearance.addChangeListener(() => {
  const { preference, scheme } = useThemeStore.getState();
  const next = resolve(preference);
  if (next !== scheme) useThemeStore.setState({ scheme: next });
});
