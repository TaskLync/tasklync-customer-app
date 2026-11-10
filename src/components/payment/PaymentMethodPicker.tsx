import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PaymentMethod } from '../../types/payment.types';
import { CardBrandIcon } from './CardBrandIcon';
import { fontFamily, radius, spacing, shadows } from '../../design';
import { Check, Lock } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { showAlert } from '../feedback/AppAlert';

export interface PaymentMethodPickerProps {
  methods: PaymentMethod[];
  selectedId: string;
  onSelect: (method: PaymentMethod) => void;
}

export const PaymentMethodPicker: React.FC<PaymentMethodPickerProps> = ({
  methods,
  selectedId,
  onSelect,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const handleSelect = (method: PaymentMethod) => {
    const isEnabled = method.isEnabled !== false && method.is_enabled !== false;
    if (!isEnabled) {
      showAlert(
        'Online Payment Unavailable',
        method.disabled_reason ||
          'Online payment platforms are temporarily disabled. Please proceed with Cash on Delivery.'
      );
      return;
    }
    onSelect(method);
  };

  return (
    <View style={styles.container}>
      {methods.map((method) => {
        const isEnabled = method.isEnabled !== false && method.is_enabled !== false;
        const isSelected = method.id === selectedId && isEnabled;
        const line1 =
          method.type === 'cash'
            ? 'Cash on Delivery (COD)'
            : method.account_number || (method.last4 ? `•••• ${method.last4}` : method.title);
        const line2 =
          method.type === 'cash'
            ? 'Pay in cash after service completion'
            : !isEnabled
            ? 'Temporarily unavailable · Online gateway offline'
            : method.subtitle;

        return (
          <TouchableOpacity
            key={method.id}
            activeOpacity={isEnabled ? 0.7 : 0.9}
            onPress={() => handleSelect(method)}
            style={[
              styles.itemRow,
              isSelected ? styles.itemSelected : styles.itemUnselected,
              !isEnabled && styles.itemDisabled,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: !isEnabled }}
            accessibilityLabel={`${line1}, ${line2}`}
          >
            {/* Left Brand Icon */}
            <View style={[styles.iconBox, !isEnabled && { opacity: 0.6 }]}>
              <CardBrandIcon brand={method.brand} size="md" />
            </View>

            {/* Middle Details */}
            <View style={styles.infoBox}>
              <View style={styles.titleRow}>
                <Text
                  style={[styles.titleText, !isEnabled && styles.titleTextDisabled]}
                  numberOfLines={1}
                >
                  {line1}
                </Text>
                {method.is_default && isEnabled && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Active</Text>
                  </View>
                )}
                {!isEnabled && (
                  <View style={styles.disabledBadge}>
                    <Lock size={10} color={colors.textMuted} />
                    <Text style={styles.disabledBadgeText}>Disabled</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.subtitleText, !isEnabled && styles.subtitleTextDisabled]}
                numberOfLines={1}
              >
                {line2}
              </Text>
            </View>

            {/* Right Radio Indicator */}
            <View
              style={[
                styles.radioOuter,
                isSelected
                  ? styles.radioOuterSelected
                  : !isEnabled
                  ? styles.radioOuterDisabled
                  : styles.radioOuterUnselected,
              ]}
            >
              {isSelected && <Check size={12} color={palette.pureWhite} strokeWidth={3} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    gap: spacing.sm + 2,
  },
  itemRow: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    ...shadows.xs,
  },
  itemUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemSelected: {
    borderWidth: 2,
    borderColor: palette.green500,
    backgroundColor: palette.green50,
  },
  itemDisabled: {
    opacity: 0.7,
    backgroundColor: palette.gray50,
    borderColor: palette.gray200,
  },
  iconBox: {
    marginRight: spacing.md,
  },
  infoBox: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  titleTextDisabled: {
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: palette.green100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  defaultBadgeText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: palette.green800,
  },
  disabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.gray200,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  disabledBadgeText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  subtitleText: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  subtitleTextDisabled: {
    color: colors.textMuted,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterUnselected: {
    borderWidth: 1.5,
    borderColor: palette.gray300,
  },
  radioOuterSelected: {
    backgroundColor: palette.green500,
  },
  radioOuterDisabled: {
    borderWidth: 1.5,
    borderColor: palette.gray200,
    backgroundColor: palette.gray100,
  },
});
