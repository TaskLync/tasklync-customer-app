import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Headphones } from 'lucide-react-native';

import {
  FAQAccordion,
  ContactOptionRow,
  RateAppRow,
} from '../../src/components/support';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../src/design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

export default function SupportScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
          Help & Support
        </Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Trust & Assistance Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconBox}>
            <Headphones size={28} color={colors.primaryDark} />
          </View>
          <View style={styles.heroTextBox}>
            <Text style={styles.heroTitle} maxFontSizeMultiplier={1.3}>
              24/7 Dedicated Support
            </Text>
            <Text style={styles.heroSubtitle} maxFontSizeMultiplier={1.3}>
              Have questions about your booking, payment, or worker? Our team is always ready to assist you.
            </Text>
          </View>
        </View>

        {/* 1. Frequently Asked Questions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
            FREQUENTLY ASKED QUESTIONS
          </Text>
          <FAQAccordion />
        </View>

        {/* 2. Direct Contact Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
            GET IN TOUCH
          </Text>
          <View style={styles.cardContainer}>
            <ContactOptionRow
              channel="whatsapp"
              title="WhatsApp Live Chat"
              subtitle="Instant response within 2-5 minutes"
              phoneNumber="+923001234567"
            />
            <View style={styles.divider} />
            <ContactOptionRow
              channel="email"
              title="Email Support"
              subtitle="support@tasklync.pk · 24hr turnaround"
              emailAddress="support@tasklync.pk"
            />
            <View style={styles.divider} />
            <ContactOptionRow
              channel="call"
              title="Customer Helpline"
              subtitle="+92 300 1234567 (Toll-Free in Pakistan)"
              phoneNumber="+923001234567"
            />
          </View>
        </View>

        {/* 3. Rate App & Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.3}>
            SHARE YOUR FEEDBACK
          </Text>
          <View style={styles.cardContainer}>
            <RateAppRow />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgApp,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.iceGray,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.green50,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: palette.green200,
    marginBottom: spacing.lg,
    ...shadows.xs,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.green100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroTextBox: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 15,
    color: palette.green900,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 17,
    color: palette.gray600,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  cardContainer: {
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: palette.gray100,
    marginLeft: spacing.base,
  },
});
