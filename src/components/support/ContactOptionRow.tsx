import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { ChatBubbleIcon, ChevronRightIcon, MailIcon, PhoneIcon } from '../ui/Icon/icons';
import { fontFamily } from '../../design';
import { useAuthStore } from '../../store/auth.store';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { showAlert } from '../feedback/AppAlert';

export type ContactChannel = 'whatsapp' | 'email' | 'call';

export interface ContactOptionRowProps {
  channel: ContactChannel;
  title: string;
  subtitle?: string | undefined;
  /** Phone number (whatsapp / call) or email address (email). Required: no built-in fallback. */
  value: string;
}

/** Minimal list row: neutral icon, title, optional detail, chevron. Opens the configured channel. */
export const ContactOptionRow: React.FC<ContactOptionRowProps> = ({ channel, title, subtitle, value }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);

  const handlePress = async () => {
    try {
      if (channel === 'whatsapp') {
        const cleanPhone = value.replace(/[^\d]/g, '');
        const message = encodeURIComponent(
          `Hello Tasklync Support, I need help with my account (User ID: ${user?.id || 'Guest'}).`
        );
        await Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`);
      } else if (channel === 'email') {
        const subject = encodeURIComponent(`Tasklync Support Request - [User: ${user?.phone || user?.name || 'Customer'}]`);
        const body = encodeURIComponent(
          `Hi Tasklync Team,\n\nI need help with:\n\n---\nUser ID: ${user?.id || 'N/A'}\nPhone: ${user?.phone || 'N/A'}`
        );
        await Linking.openURL(`mailto:${value}?subject=${subject}&body=${body}`);
      } else {
        await Linking.openURL(`tel:${value.replace(/\s/g, '')}`);
      }
    } catch (_err) {
      showAlert("Couldn't open this app", `You can contact us at ${value}.`);
    }
  };

  const Icon = channel === 'whatsapp' ? ChatBubbleIcon : channel === 'email' ? MailIcon : PhoneIcon;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      <View style={styles.iconBox}>
        <Icon size={20} color={colors.textSecondary} strokeWidth={1.8} />
      </View>

      <View style={styles.textBox}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <ChevronRightIcon size={18} color={colors.textMuted} strokeWidth={2} />
    </Pressable>
  );
};

export const supportRowStyles = ({ colors }: AppTheme) => StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.bgHover,
  },
  iconBox: {
    width: 24,
    alignItems: 'center',
    marginRight: 14,
  },
  textBox: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  title: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

const createStyles = supportRowStyles;
