import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from '../../src/components/ui/Icon/icons';

import { FAQAccordion, ContactOptionRow, RateAppRow } from '../../src/components/support';
import { SUPPORT_CONFIG, formatSupportPhone } from '../../src/config/support.config';
import { fontFamily } from '../../src/design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

/**
 * Help & Support: a short intro, then three plain lists (FAQ, contact, feedback) on a white / charcoal page.
 * Contact rows appear only for channels that are actually configured (see config/support.config.ts),
 * and no response times or availability are promised.
 */
export default function SupportScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { whatsapp, email, phone } = SUPPORT_CONFIG;
  const contactRows = [
    whatsapp ? { key: 'whatsapp', channel: 'whatsapp' as const, title: 'WhatsApp', subtitle: 'Chat with our support team', value: whatsapp } : null,
    email ? { key: 'email', channel: 'email' as const, title: 'Email', subtitle: email, value: email } : null,
    phone ? { key: 'call', channel: 'call' as const, title: 'Call us', subtitle: formatSupportPhone(phone), value: phone } : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);
  // RateAppRow needs a real App Store id on iOS; without it the whole Feedback section is hidden.
  const showRate = Platform.OS !== 'ios' || Boolean(SUPPORT_CONFIG.iosAppStoreId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon size={22} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3} accessibilityRole="header">
          Help & Support
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle} maxFontSizeMultiplier={1.3}>
            How can we help?
          </Text>
          <Text style={styles.introText} maxFontSizeMultiplier={1.3}>
            Find answers or contact our support team.
          </Text>
        </View>

        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
          Common questions
        </Text>
        <FAQAccordion />

        {contactRows.length > 0 ? (
          <>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
              Contact us
            </Text>
            <View style={styles.list}>
              {contactRows.map((row, i) => (
                <View key={row.key}>
                  {i > 0 && <View style={styles.rowDivider} />}
                  <ContactOptionRow channel={row.channel} title={row.title} subtitle={row.subtitle} value={row.value} />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {showRate ? (
          <>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
              Feedback
            </Text>
            <View style={styles.list}>
              <RateAppRow />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: colors.bgHover,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 44,
  },
  intro: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  introTitle: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  introText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 8,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  // Inset to line up with the row text (20 padding + 24 icon + 14 gap).
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 58,
  },
});
