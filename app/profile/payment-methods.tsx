import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Lock } from 'lucide-react-native';

import { usePaymentMethods } from '../../src/hooks/usePaymentMethods';
import {
  PaymentMethodCard,
  PaymentMethodCardSkeleton,
  PaymentMethodSwipeActions,
  AddCardButton,
} from '../../src/components/payment';
import { fontFamily, fontSize, spacing, shadows, radius } from '../../src/design';
import { ONLINE_PAYMENTS_DISABLED_MESSAGE } from '../../src/types/payment.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';

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

  const handleBack = () => {
    router.back();
  };

  const handleAddPress = () => {
    showAlert(
      'Online Payments Unavailable',
      `${ONLINE_PAYMENTS_DISABLED_MESSAGE}\n\nAdding credit/debit cards or mobile wallets is temporarily paused while online gateways are safely disconnected.`
    );
  };

  const renderHeaderNotice = () => (
    <View style={styles.statusBanner}>
      <View style={styles.statusDotWrapper}>
        <View style={styles.statusDot} />
      </View>
      <Text style={styles.statusBannerText} maxFontSizeMultiplier={1.2}>
        Cash on Delivery Active
      </Text>
    </View>
  );

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
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
          Payment Methods
        </Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {renderHeaderNotice()}

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <PaymentMethodCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={methods}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: spacing.xs,
              paddingBottom: insets.bottom + 80,
            }}
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

      {/* Sticky Bottom Footer CTA */}
      <View
        style={[
          styles.footerContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
        ]}
      >
        <AddCardButton
          label="Online Payments Unavailable"
          icon={<Lock size={15} color={colors.textOnGreen} strokeWidth={2.2} />}
          onPress={handleAddPress}
        />
      </View>
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    width: 38,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.green50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.green200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  statusDotWrapper: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.green100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusBannerText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
    includeFontPadding: false,
  },
  skeletonContainer: {
    gap: spacing.xs,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.base,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
});
