import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { fontFamily, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface SecurePaymentNoticeProps {
  customText?: string;
}

export const SecurePaymentNotice: React.FC<SecurePaymentNoticeProps> = ({
  customText = '🔒 Payments secured by 256-bit encryption. Tasklync never stores your card PIN or CVV.',
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <ShieldCheck size={16} color={palette.green600} style={styles.icon} />
      <Text style={styles.noticeText} maxFontSizeMultiplier={1.3}>
        {customText}
      </Text>
    </View>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.green50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  icon: {
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  noticeText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: palette.gray600,
  },
});
