import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon, InfoIcon, LockIcon } from '../../src/components/ui/Icon/icons';

import { usePaymentMethods } from '../../src/hooks/usePaymentMethods';
import {
  PaymentMethodCard,
  PaymentMethodCardSkeleton,
  PaymentMethodSwipeActions,
} from '../../src/components/payment';
import { fontFamily, spacing } from '../../src/design';
import { ONLINE_PAYMENTS_DISABLED_MESSAGE } from '../../src/types/payment.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';

/**
 * Payment Methods
 * Neutral surfaces, charcoal type, thin borders. Green appears only as the "active" status dot.
 * Online payments are switched off product-wide, so the footer is an explicit disabled-state notice
 * (tapping it explains why), never a primary-looking button.
 */
export default function PaymentMethodsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    methods,
    isLoading,
    deleteMethod,
    setDefaultMethod,
  } = usePaymentMethods();

  const handleOnlinePaymentsInfo = () => {
    showAlert(
      'Online payments unavailable',
      `${ONLINE_PAYMENTS_DISABLED_MESSAGE}\n\nYou can't add cards or mobile wallets right now.`
    );
  };

  const cashActive = methods.some((m) => m.type === 'cash');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />

      {/* Header: minimal back control, centred title, no bar background */}
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
          Payment Methods
        </Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.content}>
        {/* Status: a quiet line with a single green dot */}
        {!isLoading && cashActive ? (
          <View style={styles.statusRow} accessible accessibilityLabel="Cash on Delivery is active">
            <View style={styles.statusDot} />
            <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>
              Cash on Delivery is active
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <PaymentMethodCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={methods}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.listGap} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PaymentMethodSwipeActions
                method={item}
                onDelete={(id) => deleteMethod(id)}
              >
                <PaymentMethodCard
                  method={item}
                  onSetDefault={(id) => setDefaultMethod(id)}
                />
              </PaymentMethodSwipeActions>
            )}
          />
        )}
      </View>

      {/* Footer: disabled-state notice for online payments (not a primary action) */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <Pressable
          onPress={handleOnlinePaymentsInfo}
          style={({ pressed }) => [styles.unavailableRow, pressed && styles.unavailableRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Online payments are currently unavailable"
          accessibilityHint="Shows why only Cash on Delivery is available"
        >
          <LockIcon size={15} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.unavailableText} maxFontSizeMultiplier={1.3}>
            Online payments are currently unavailable
          </Text>
          <InfoIcon size={15} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  // Pure white in Light, deep charcoal in Dark (bgCard is the base surface in both themes).
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
  headerRightSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13.5,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  skeletonContainer: {
    gap: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  listGap: {
    height: 10,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: 12,
    backgroundColor: colors.bgCard,
  },
  // Disabled look: neutral surface, muted text, no fill colour, no shadow.
  unavailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.bgHover,
  },
  unavailableRowPressed: {
    opacity: 0.75,
  },
  unavailableText: {
    flexShrink: 1,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13.5,
    // textSecondary, not textMuted: muted grey on the grey surface falls below readable contrast in Light.
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
