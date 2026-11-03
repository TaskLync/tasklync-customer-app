import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Star, ChevronRight } from 'lucide-react-native';
import { colors, palette, fontFamily, spacing } from '../../design';

export const RateAppRow: React.FC = () => {
  const handleRatePress = async () => {

    const iosStoreUrl = 'https://apps.apple.com/app/id6440000000?action=write-review';
    const androidStoreUrl = 'market://details?id=pk.tasklync.customer';
    const webFallbackUrl = 'https://play.google.com/store/apps/details?id=pk.tasklync.customer';

    try {
      const url = Platform.OS === 'ios' ? iosStoreUrl : androidStoreUrl;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
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
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleRatePress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel="Rate Tasklync App on App Store or Google Play"
    >
      <View style={styles.iconCircle}>
        <Star size={20} color={palette.amber500} fill={palette.amber200} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.titleText} maxFontSizeMultiplier={1.3}>
          Rate Tasklync App
        </Text>
        <Text style={styles.subtitleText} maxFontSizeMultiplier={1.3}>
          Share your experience on the {Platform.OS === 'ios' ? 'App Store' : 'Google Play Store'}
        </Text>
      </View>

      <ChevronRight size={18} color={palette.gray400} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.bgCard,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.amber100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  titleText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  subtitleText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
});
