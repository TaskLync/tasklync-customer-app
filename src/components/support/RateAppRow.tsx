import { View, Text, Pressable, Linking, Platform } from 'react-native';
import { ChevronRightIcon, StarIcon } from '../ui/Icon/icons';
import { SUPPORT_CONFIG } from '../../config/support.config';
import { useAppTheme, useThemedStyles } from '../../theme/useAppTheme';
import { supportRowStyles } from './ContactOptionRow';

/**
 * "Rate Tasklync": opens this app's store listing. Uses the real Android package (com.tasklync.user);
 * on iOS the row only appears once a real App Store id is configured (EXPO_PUBLIC_IOS_APP_STORE_ID).
 */
export const RateAppRow: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(supportRowStyles);

  const iosId = SUPPORT_CONFIG.iosAppStoreId;
  if (Platform.OS === 'ios' && !iosId) return null;

  const handleRatePress = async () => {
    const pkg = SUPPORT_CONFIG.androidPackage;
    const webFallbackUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
    const url =
      Platform.OS === 'ios'
        ? `https://apps.apple.com/app/id${iosId}?action=write-review`
        : `market://details?id=${pkg}`;
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webFallbackUrl);
      }
    } catch (_err) {
      try {
        await Linking.openURL(webFallbackUrl);
      } catch {}
    }
  };

  return (
    <Pressable
      onPress={handleRatePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Rate Tasklync on the ${Platform.OS === 'ios' ? 'App Store' : 'Google Play Store'}`}
    >
      <View style={styles.iconBox}>
        <StarIcon size={20} color={colors.textSecondary} strokeWidth={1.8} />
      </View>
      <View style={styles.textBox}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          Rate Tasklync
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
          Share your feedback
        </Text>
      </View>
      <ChevronRightIcon size={18} color={colors.textMuted} strokeWidth={2} />
    </Pressable>
  );
};
