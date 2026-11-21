import { FC, useState } from 'react';
import { StyleSheet, Text, Pressable, View, ViewStyle } from 'react-native';
import { useCartStore } from '../../store/cart.store';
import { WorkerConflictModal } from './WorkerConflictModal';
import { CheckIcon } from '../ui/Icon/icons';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface AddToCartButtonProps {
  serviceId: string;
  serviceName: string;
  price: number;
  workerId?: string | null | undefined;
  workerName?: string | undefined;
  workerAvatar?: string | null | undefined;
  workerRating?: number | undefined;
  workerCategory?: string | undefined;
  isVerified?: boolean | undefined;
  size?: 'sm' | 'md' | undefined;
  onAdd?: (() => void) | undefined;
  /** @deprecated Removal happens in the cart; kept so existing callers compile. */
  onRemove?: (() => void) | undefined;
  style?: ViewStyle | undefined;
}

/**
 * Add / Added. A service is booked once, so there is no quantity: "Add" puts it in the cart and the
 * control then reads "Added" and adds nothing more. The customer removes it from the cart.
 * Both states share one width so the row never shifts.
 */
export const AddToCartButton: FC<AddToCartButtonProps> = ({
  serviceId,
  serviceName,
  price,
  workerId,
  workerName,
  workerAvatar,
  workerRating,
  workerCategory,
  isVerified,
  size = 'sm',
  onAdd,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isAdded = useCartStore((state) => state.items.some((i) => i.serviceId === serviceId));
  const currentWorker = useCartStore((state) => state.worker);
  const addItem = useCartStore((state) => state.addItem);
  const replaceCart = useCartStore((state) => state.replaceCart);

  const [showConflictModal, setShowConflictModal] = useState(false);

  const isSm = size === 'sm';
  const width = isSm ? 88 : 100;
  const height = isSm ? 32 : 38;
  const labelSize = isSm ? 13 : 14;

  // Optional fields are only present when known (exactOptionalPropertyTypes). A missing worker id stays
  // falsy, exactly as before, so the cart's single-worker rule and booking validation behave the same.
  const payload = () => ({
    serviceId,
    serviceName,
    price,
    workerId: workerId || '',
    ...(workerName ? { workerName } : {}),
    ...(workerAvatar !== undefined ? { workerAvatar } : {}),
    ...(workerRating !== undefined ? { workerRating } : {}),
    ...(workerCategory ? { workerCategory } : {}),
    ...(isVerified !== undefined ? { isVerified } : {}),
  });

  const handleAdd = (e: any) => {
    e?.stopPropagation?.();
    const res = addItem(payload());
    if (res.hasConflict) {
      setShowConflictModal(true);
      return;
    }
    if (res.success && onAdd) onAdd();
  };

  const handleConfirmReplaceCart = () => {
    setShowConflictModal(false);
    replaceCart(payload());
    if (onAdd) onAdd();
  };

  return (
    <>
      {isAdded ? (
        <View
          style={[styles.pill, styles.added, { width, height }, style]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${serviceName} added to cart`}
          accessibilityState={{ disabled: true, selected: true }}
        >
          <CheckIcon size={isSm ? 14 : 16} color={colors.primaryDark} strokeWidth={2.4} />
          <Text style={[styles.addedText, { fontSize: labelSize }]}>Added</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.pill, styles.idle, { width, height }, pressed && styles.pressed, style]}
          onPress={handleAdd}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Add ${serviceName} to cart`}
        >
          <Text style={[styles.addSymbol, { fontSize: labelSize + 1 }]}>+</Text>
          <Text style={[styles.addText, { fontSize: labelSize }]}>Add</Text>
        </Pressable>
      )}

      {/* Worker conflict modal */}
      <WorkerConflictModal
        visible={showConflictModal}
        currentWorkerName={currentWorker?.name}
        incomingWorkerName={workerName}
        onCancel={() => setShowConflictModal(false)}
        onReplace={handleConfirmReplaceCart}
      />
    </>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 100,
  },
  idle: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  added: {
    backgroundColor: colors.primaryTint,
  },
  pressed: {
    opacity: 0.7,
  },
  addSymbol: {
    fontFamily: typography.fontFamily.poppins.bold,
    color: colors.primary,
    includeFontPadding: false,
    lineHeight: 18,
  },
  addText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    color: colors.primary,
    includeFontPadding: false,
  },
  addedText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    color: colors.primaryDark,
    includeFontPadding: false,
  },
});
