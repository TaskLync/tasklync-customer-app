import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { CashIcon } from '../ui/Icon/icons';
import { PaymentMethod } from '../../types/payment.types';
import { CardBrandIcon } from './CardBrandIcon';
import { fontFamily, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface PaymentMethodCardProps {
  method: PaymentMethod;
  isNewlyAdded?: boolean;
  onSetDefault?: (id: string) => void;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  isNewlyAdded = false,
  onSetDefault,
}) => {
  const { colors } = useAppTheme();
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { id, type, brand, title, subtitle, account_number, last4, exp_month, exp_year, is_default } = method;

  // Highlight animation on freshly added item: 400ms transition from green-50 to white
  const highlightProgress = useSharedValue(isNewlyAdded ? 1 : 0);

  useEffect(() => {
    if (isNewlyAdded) {
      highlightProgress.value = 1;
      highlightProgress.value = withTiming(0, { duration: 400 });
    }
  }, [isNewlyAdded, highlightProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!isNewlyAdded) return {};
    const backgroundColor = interpolateColor(
      highlightProgress.value,
      [0, 1],
      [colors.cardRaised, palette.green50]
    );
    return { backgroundColor };
  });

  const handleSetDefault = () => {
    if (onSetDefault) {
      onSetDefault(id);
    }
  };

  // Determine line 1 text (Inter Medium 15px)
  const line1Text =
    account_number ||
    (last4 ? `•••• ${last4}` : title);

  // Determine line 2 text (Concise: "Pay after service completion" for cash)
  const line2Text =
    type === 'cash'
      ? 'Pay after your service is completed'
      : type === 'wallet'
      ? `${brand === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Direct Account`
      : exp_month && exp_year
      ? `Expires ${String(exp_month).padStart(2, '0')}/${String(exp_year).slice(-2)}`
      : subtitle;

  const a11yAnnouncement = `${title}, ${line2Text}, ${is_default ? 'Default payment method' : ''}`;

  return (
    <Animated.View
      style={[styles.cardContainer, animatedStyle]}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={a11yAnnouncement}
    >
      {/* Left: method icon. Cash uses a neutral tile; cards/wallets keep their brand mark. */}
      <View style={styles.iconContainer}>
        {type === 'cash' ? (
          <View style={styles.cashIconTile}>
            <CashIcon size={20} color={colors.textSecondary} strokeWidth={1.8} />
          </View>
        ) : (
          <CardBrandIcon brand={brand} size="md" />
        )}
      </View>

      {/* Middle: Data & Label */}
      <View style={styles.contentContainer}>
        <Text
          style={styles.line1}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {line1Text}
        </Text>
        <Text
          style={styles.line2}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {line2Text}
        </Text>
      </View>

      {/* Right: Default Chip or Set as Default CTA */}
      <View style={styles.actionContainer}>
        {is_default ? (
          <View style={styles.defaultChip}>
            <Text style={styles.defaultChipText} maxFontSizeMultiplier={1.2}>
              Default
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSetDefault}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`Set ${title} as default payment method`}
            style={styles.setDefaultButton}
          >
            <Text style={styles.setDefaultText} maxFontSizeMultiplier={1.2}>
              Set as default
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  // Neutral, thin-bordered card: white in Light, lifted charcoal in Dark. Green is not used for "default".
  cardContainer: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  iconContainer: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashIconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  line1: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  line2: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  defaultChip: {
    backgroundColor: colors.bgHover,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  defaultChipText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  setDefaultButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  setDefaultText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.primaryDark,
    lineHeight: 16,
  },
});
