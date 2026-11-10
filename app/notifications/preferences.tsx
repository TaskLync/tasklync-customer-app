import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CalendarCheck, CreditCard, MessageSquare, Star, Sparkles, Shield } from 'lucide-react-native';
import { notificationApi } from '../../src/services/api/notification.api';
import { CategoryPreference, NotificationCategory } from '../../src/types/notification.types';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { useAppTheme } from '../../src/theme/useAppTheme';

type CategoryMeta = { label: string; description: string; icon: any; color: string };

const createCategoryMetadata = ({ colors, palette }: AppTheme): Record<NotificationCategory, CategoryMeta> => ({
  booking: {
    label: 'Booking Updates',
    description: 'Acceptance, start, arrival, and completion alerts',
    icon: CalendarCheck,
    color: colors.primaryDark,
  },
  payment: {
    label: 'Payments & Receipts',
    description: 'Payment confirmations, refunds, and escrow notices',
    icon: CreditCard,
    color: colors.warningMedium,
  },
  chat: {
    label: 'Direct Messages',
    description: 'Messages and photos from assigned service professionals',
    icon: MessageSquare,
    color: colors.textInfo,
  },
  review: {
    label: 'Ratings & Reviews',
    description: 'Feedback requests and review verification',
    icon: Star,
    color: colors.starFilled,
  },
  worker: {
    label: 'Worker Updates',
    description: 'Worker profile and status updates',
    icon: Shield,
    color: colors.textSecondary,
  },
  platform: {
    label: 'Platform & Security',
    description: 'Account security and service terms notices',
    icon: Bell,
    color: colors.textPrimary,
  },
  marketing: {
    label: 'Offers & Promotions',
    description: 'Seasonal discounts and featured service recommendations',
    icon: Sparkles,
    color: palette.purple600,
  },
});

export default function NotificationPreferencesScreen() {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const categoryMetadata = useThemedStyles(createCategoryMetadata);
  const insets = useSafeAreaInsets();

  const [preferences, setPreferences] = useState<CategoryPreference[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    notificationApi.getPreferences().then((data) => {
      setPreferences(data);
      setIsLoading(false);
    });
  }, []);

  const handleToggle = useCallback(
    async (
      category: NotificationCategory,
      channel: 'push_enabled' | 'sms_enabled' | 'email_enabled',
      value: boolean
    ) => {

      // 1. Optimistic UI update
      setPreferences((prev) =>
        prev.map((pref) =>
          pref.category === category ? { ...pref, [channel]: value } : pref
        )
      );

      const target = preferences.find((p) => p.category === category) || {
        category,
        push_enabled: true,
        sms_enabled: true,
        email_enabled: false,
      };

      const payload = {
        ...target,
        [channel]: value,
      };

      await notificationApi.updatePreference(payload);
    },
    [preferences]
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHeader}>NOTIFICATION CHANNELS BY CATEGORY</Text>

          {preferences.map((pref) => {
            const meta = categoryMetadata[pref.category as NotificationCategory] || {
              label: pref.category,
              description: 'Notifications for this category',
              icon: Bell,
              color: colors.primaryDark,
            };
            const Icon = meta.icon;

            return (
              <View key={pref.category} style={styles.preferenceCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: `${meta.color}15` }]}>
                    <Icon size={18} color={meta.color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.cardHeaderTextCol}>
                    <Text style={styles.cardTitle}>{meta.label}</Text>
                    <Text style={styles.cardSubtitle}>{meta.description}</Text>
                  </View>
                </View>

                {/* Toggles */}
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Push Notifications</Text>
                  <Switch
                    value={pref.push_enabled}
                    onValueChange={(val) => handleToggle(pref.category, 'push_enabled', val)}
                    trackColor={{ false: colors.border, true: palette.green300 }}
                    thumbColor={pref.push_enabled ? colors.primaryDark : colors.white}
                  />
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>SMS Text Messages</Text>
                  <Switch
                    value={pref.sms_enabled}
                    onValueChange={(val) => handleToggle(pref.category, 'sms_enabled', val)}
                    trackColor={{ false: colors.border, true: palette.green300 }}
                    thumbColor={pref.sms_enabled ? colors.primaryDark : colors.white}
                  />
                </View>

                <View style={[styles.toggleRow, styles.toggleRowLast]}>
                  <Text style={styles.toggleLabel}>Email Updates</Text>
                  <Switch
                    value={pref.email_enabled}
                    onValueChange={(val) => handleToggle(pref.category, 'email_enabled', val)}
                    trackColor={{ false: colors.border, true: palette.green300 }}
                    thumbColor={pref.email_enabled ? colors.primaryDark : colors.white}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSubtle,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 38,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  preferenceCard: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  toggleRowLast: {
    paddingBottom: 0,
  },
  toggleLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
