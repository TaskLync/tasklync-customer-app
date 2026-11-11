const { withAndroidStyles } = require('@expo/config-plugins');

/**
 * Edge-to-edge puts the app behind a transparent Android navigation bar, but by default Android draws a
 * translucent contrast scrim over it in 3-button navigation (the "darker strip" under the tab bar).
 * Turning enforcement off lets the app's own tab bar surface show through unchanged, so the tab bar and
 * the system navigation area read as one surface. Gesture navigation has no scrim and is unaffected.
 * Button icon colour is then driven at runtime from the theme (see src/theme/SystemNavigationBar.tsx).
 */
module.exports = function withTransparentNavigationBar(config) {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults;
    const appTheme = styles.resources.style?.find((s) => s.$.name === 'AppTheme');
    if (appTheme) {
      appTheme.item = (appTheme.item || []).filter((i) => i.$.name !== 'android:enforceNavigationBarContrast');
      appTheme.item.push({ $: { name: 'android:enforceNavigationBarContrast' }, _: 'false' });
    }
    return cfg;
  });
};
