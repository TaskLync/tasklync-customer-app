import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Plus, ChevronRight, Lock } from 'lucide-react-native';
import { colors, palette, fontFamily } from '../../design';

export interface AddNewCardRowProps {
  onPress?: () => void;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
}

export const AddNewCardRow: React.FC<AddNewCardRowProps> = ({
  onPress,
  title = 'Add Payment Method',
  subtitle = 'Online methods currently unavailable · Cash on Delivery active',
  disabled = true,
}) => {
  const handlePress = () => {
    if (disabled) {
      Alert.alert(
        'Online Payments Disabled',
        'Online payment registration (Debit/Credit Card, JazzCash, EasyPaisa) is temporarily paused while online gateways are offline. Cash on Delivery is automatically active for all your bookings.'
      );
      return;
    }
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.rowContainer,
          disabled && styles.rowDisabled,
          pressed && !disabled && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add new payment method"
      >
        <View style={styles.leftGroup}>
          <View style={[styles.plusCircle, disabled && styles.plusCircleDisabled]}>
            {disabled ? (
              <Lock size={16} color={colors.textMuted} strokeWidth={2.2} />
            ) : (
              <Plus size={18} color={colors.primaryDark} strokeWidth={2.4} />
            )}
          </View>
          <View style={styles.textColumn}>
            <Text style={[styles.titleText, disabled && styles.titleTextDisabled]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitleText, disabled && styles.subtitleTextDisabled]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
};

// Compatibility export
export const AddNewPaymentMethodRow = AddNewCardRow;

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    borderStyle: 'dashed',
    shadowColor: palette.gray900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  rowDisabled: {
    backgroundColor: palette.gray50,
    borderColor: palette.gray200,
    opacity: 0.85,
  },
  rowPressed: {
    backgroundColor: palette.gray50,
    borderColor: colors.primary,
    transform: [{ scale: 0.99 }],
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  plusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  plusCircleDisabled: {
    backgroundColor: palette.gray200,
  },
  textColumn: {
    flex: 1,
  },
  titleText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  titleTextDisabled: {
    color: colors.textSecondary,
  },
  subtitleText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  subtitleTextDisabled: {
    color: colors.textMuted,
  },
});
