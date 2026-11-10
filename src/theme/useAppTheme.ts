import { useThemeStore } from '../store/theme.store';
import { getTheme, type AppTheme } from '../design/themes';

export type { AppTheme } from '../design/themes';

/**
 * Active theme tokens: `{ scheme, isDark, colors, palette }`.
 * Components re-render when the scheme changes (device appearance or user preference).
 */
export function useAppTheme(): AppTheme {
  return getTheme(useThemeStore((s) => s.scheme));
}

/** Non-React access (services, imperative code). Not reactive: prefer the hook in components. */
export function getAppTheme(): AppTheme {
  return getTheme(useThemeStore.getState().scheme);
}

// Styles are built once per (factory, scheme) and shared by every instance, so a list of 200 rows
// creates one style object, not 200.
const cache = new WeakMap<object, Partial<Record<AppTheme['scheme'], unknown>>>();

function resolveStyles<T>(factory: (theme: AppTheme) => T, theme: AppTheme): T {
  let entry = cache.get(factory);
  if (!entry) {
    entry = {};
    cache.set(factory, entry);
  }
  if (!(theme.scheme in entry)) entry[theme.scheme] = factory(theme);
  return entry[theme.scheme] as T;
}

/**
 * `const styles = useThemedStyles(createStyles)` where
 * `const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({...})`.
 * `factory` must be a module-level function (stable identity).
 */
export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  return resolveStyles(factory, useAppTheme());
}
