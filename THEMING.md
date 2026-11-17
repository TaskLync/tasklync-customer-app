# Theming (Light / Dark)

The app follows the device appearance by default and can be pinned to Light or Dark in **Profile → Settings → Appearance**.

## How it fits together

| Piece | File | Role |
| --- | --- | --- |
| Palettes | `src/design/colors.ts` (`lightPalette`), `src/design/themes.ts` (`darkPalette`) | Raw colour scales. Same keys in both (enforced by the `Palette` type and a test). |
| Semantic tokens | `buildColors()` in `colors.ts` | `colors.*` is derived from a palette, so a theme is defined once. |
| Themes | `lightTheme`, `darkTheme`, `getTheme()` in `themes.ts` | `{ scheme, isDark, palette, colors, companyTokens }`, stable singletons. |
| State | `src/store/theme.store.ts` | `preference` (`system` \| `light` \| `dark`) + resolved `scheme`. One `Appearance` listener. Pushes the choice to the OS with `Appearance.setColorScheme`, so keyboard, system dialogs and the status bar agree. Read synchronously at import, so the first frame is already correct. |
| Hooks | `src/theme/useAppTheme.ts` | `useAppTheme()`, `useThemedStyles(factory)`, `getAppTheme()` (non-React code). |
| Status bar | `src/theme/ThemedStatusBar.tsx` | Replaces hard-coded `dark-content` bars. |
| Native shell | `app/_layout.tsx` | Navigation theme, root background, `expo-system-ui` window colour. |

## Writing a component

```tsx
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export function Row() {
  const { colors } = useAppTheme();          // for props: icon colour, placeholderTextColor, ...
  const styles = useThemedStyles(createStyles); // for StyleSheet
  return <View style={styles.row}><Chevron color={colors.textMuted} /></View>;
}

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({ row: { backgroundColor: colors.bgCard, borderColor: colors.border } });
```

`createStyles` must be a module-level function; its result is cached per scheme and shared by every instance.

## Rules

- Never import the static `colors` / `palette` from `design/colors` in a component. They are the light values, kept only for non-React code. Read the active theme with the hooks above.
- Prefer semantic tokens (`colors.surface`, `colors.textPrimary`, `colors.divider`, `colors.placeholder`, `colors.bottomSheetBackground`, `colors.modalBackground`, `colors.inverseSurface`...) over raw palette steps.
- **Text or icons on a brand/photo surface stay white in both themes**: use `pureWhite` / `colors.textOnGreen`. `palette.white` is a *surface* colour and is dark in Dark mode.
- High-contrast chips and black buttons use the inverse pair: `colors.inverseSurface` + `colors.textInverse` (dark chip in Light, light chip in Dark).
- Sheets, modals and popovers use `bottomSheetBackground` / `modalBackground` / `surfaceElevated` so they lift off the screen in Dark.
- Shadows use `colors.black`; they do not use a palette step (light shadow colours glow in Dark).
- Colours with alpha: `withAlpha(colors.border, 0.5)` (`src/design/colorUtils.ts`).
- Helpers that return colours (`statusToColor`, ...) call `getAppTheme()`; component-level maps use `useThemedStyles(createXyz)`.
- Class components cannot use hooks: render a function component for the themed part (see `ErrorBoundary`).

## Verification

`npm test` includes `__tests__/theme/themeContrast.test.ts`: token parity between themes, the unchanged Light identity, and WCAG contrast of text, status, brand and border tokens on every surface in both themes.

## Buttons (single source of truth)

One primary colour for every solid brand action, identical in Light and Dark: `colors.buttonPrimary` (#15803D, pressed `buttonPrimaryPressed`), label `buttonPrimaryText` (white, 5:1). Disabled is neutral grey (`buttonPrimaryDisabled*`), never a faded green.

| Role | Tokens |
| --- | --- |
| Primary | `buttonPrimary`, `buttonPrimaryPressed`, `buttonPrimaryText` |
| Secondary | `buttonSecondary`, `buttonSecondaryPressed`, `buttonSecondaryText`, `buttonSecondaryBorder` (neutral, never green) |
| Destructive | `buttonDestructive`, `buttonDestructivePressed`, `buttonDestructiveText` (Delete, Cancel booking, Remove) |

Use `<Button variant="primary|secondary|danger" />` (`src/components/ui/Button`). A hand-rolled button must read these tokens, not `primary`/`primaryDark`/`palette.green*`. Selected states (radio, checkbox, selected chip, focus ring) use `buttonPrimary` too, so there is one solid green. Green tints (`green50/100`) are reserved for functional states (selected, success, verified, applied); decorative icon circles, avatar fallbacks and info banners use `bgHover`/neutral surfaces. Guarded by `__tests__/theme/buttonTokens.test.ts`.
