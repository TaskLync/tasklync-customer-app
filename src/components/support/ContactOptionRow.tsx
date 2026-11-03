import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { MessageCircle, Mail, Phone, ChevronRight } from 'lucide-react-native';
import { colors, palette, fontFamily, spacing } from '../../design';
import { useAuthStore } from '../../store/auth.store';

export type ContactChannel = 'whatsapp' | 'email' | 'call';

export interface ContactOptionRowProps {
  channel: ContactChannel;
  title: string;
  subtitle: string;
  phoneNumber?: string;
  emailAddress?: string;
}

export const ContactOptionRow: React.FC<ContactOptionRowProps> = ({
  channel,
  title,
  subtitle,
  phoneNumber = '+923001234567',
  emailAddress = 'support@tasklync.pk',
}) => {
  const user = useAuthStore((s) => s.user);

  const handlePress = async () => {

    try {
      if (channel === 'whatsapp') {
        const cleanPhone = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
        const message = encodeURIComponent(
          `Hello Tasklync Support, I need help with my account (User ID: ${user?.id || 'Guest'}).`
        );
        const url = `https://wa.me/${cleanPhone}?text=${message}`;
        await Linking.openURL(url);
      } else if (channel === 'email') {
        const subject = encodeURIComponent(`Tasklync Support Request - [User: ${user?.phone || user?.name || 'Customer'}]`);
        const body = encodeURIComponent(
          `Hi Tasklync Team,\n\nI need assistance with:\n\n---\nApp Version: v1.0.0 (Build 37)\nUser ID: ${user?.id || 'N/A'}\nPhone: ${user?.phone || 'N/A'}`
        );
        const mailUrl = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
        await Linking.openURL(mailUrl);
      } else if (channel === 'call') {
        const telUrl = `tel:${phoneNumber.replace(/\s/g, '')}`;
        await Linking.openURL(telUrl);
      }
    } catch (_err) {
      Alert.alert(
        'Unable to Open Channel',
        `Please reach out directly at ${channel === 'email' ? emailAddress : phoneNumber}.`
      );
    }
  };

  const renderIcon = () => {
    if (channel === 'whatsapp') {
      return (
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <MessageCircle size={20} color={colors.primaryDark} />
        </View>
      );
    }
    if (channel === 'email') {
      return (
        <View style={[styles.iconCircle, { backgroundColor: colors.infoLight }]}>
          <Mail size={20} color={colors.textInfo} />
        </View>
      );
    }
    return (
      <View style={[styles.iconCircle, { backgroundColor: colors.warningLight }]}>
        <Phone size={20} color={colors.warningMedium} />
      </View>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={styles.rowContainer}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
    >
      {renderIcon()}

      <View style={styles.textContainer}>
        <Text style={styles.titleText} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        <Text style={styles.subtitleText} maxFontSizeMultiplier={1.3}>
          {subtitle}
        </Text>
      </View>

      <ChevronRight size={18} color={palette.gray400} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
