import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Globe,
  DollarSign,
  Info,
} from 'lucide-react-native';

import { useAppPreferences } from '../../src/hooks/useAppPreferences';
import { useNotificationPreferences } from '../../src/hooks/useNotificationPreferences';
import {
  SettingsSection,
  SettingsRow,
  LanguageToggle,
  CurrencyToggle,
  NotificationPreferenceGroup,
  AppVersionRow,
} from '../../src/components/settings';
import { colors, palette, fontFamily, fontSize, spacing } from '../../src/design';

/**
 * SettingsScreen (Uber / Foodpanda / Careem Minimalist Standard)
 *
 * Architecture & UX:
 * 1. Three clearly segregated grouped cards: Preferences, Notifications, and About & Legal.
 * 2. Visual Hierarchy: Clean typography, uniform 18px neutral icons, and aligned dividers.
 * 3. Modern Segmented Controls: Pill-style active state with consistent dimensions.
 * 4. Native Notification Switches: Pure white thumb on brand-green active track, full row touch target.
 * 5. Full Persistence: MMKV storage cache + background sync with graceful error handling.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { language, currency, setLanguage, setCurrency } = useAppPreferences();
  const { preferences, togglePreference } = useNotificationPreferences();

  const handleBack = () => {
    router.back();
  };

  const handleOpenLegal = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (_e) {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.white} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
          App Settings
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
        {/* 1. Preferences Section (Language & Currency) */}
        <SettingsSection title="Preferences">
          <SettingsRow
            label="App Language"
            icon={<Globe size={18} color={palette.gray500} />}
            rightElement={
              <LanguageToggle value={language} onChange={setLanguage} />
            }
          />

          <SettingsRow
            label="Display Currency"
            icon={<DollarSign size={18} color={palette.gray500} />}
            rightElement={
              <CurrencyToggle value={currency} onChange={setCurrency} />
            }
          />
        </SettingsSection>

        {/* 2. Notifications Section */}
        <SettingsSection title="Notifications">
          <NotificationPreferenceGroup
            preferences={preferences}
            onToggle={togglePreference}
          />
        </SettingsSection>

        {/* 3. About & Legal Section */}
        <SettingsSection title="About & Legal">
          <SettingsRow
            label="Terms of Service"
            icon={<FileText size={18} color={palette.gray500} />}
            showChevron={true}
            onPress={() => handleOpenLegal('https://tasklync.pk/terms')}
          />

          <SettingsRow
            label="Privacy Policy"
            icon={<ShieldCheck size={18} color={palette.gray500} />}
            showChevron={true}
            onPress={() => handleOpenLegal('https://tasklync.pk/privacy')}
          />

          <AppVersionRow
            version="v1.0.0"
            buildNumber="Build 37"
            icon={<Info size={18} color={palette.gray500} />}
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
    backgroundColor: palette.white,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gray100,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4 + 1,
    color: colors.textPrimary,
  },
  headerRightSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
});
