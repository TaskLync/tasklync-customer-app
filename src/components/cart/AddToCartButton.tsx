import { FC, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useCartStore } from '../../store/cart.store';
import { WorkerConflictModal } from './WorkerConflictModal';
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
  onRemove?: (() => void) | undefined;
  style?: ViewStyle | undefined;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  onRemove,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const items = useCartStore((state) => state.items);
  const currentWorker = useCartStore((state) => state.worker);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const replaceCart = useCartStore((state) => state.replaceCart);

  const [showConflictModal, setShowConflictModal] = useState(false);

  // Sync count with cart store item
  const existingItem = items.find((i) => i.serviceId === serviceId);
  const count = existingItem ? existingItem.quantity : 0;

  // Reanimated Shared Values
  const isSm = size === 'sm';
  const targetIdleWidth = isSm ? 80 : 90;
  const targetActiveWidth = isSm ? 108 : 120;
  const buttonHeight = isSm ? 32 : 38;

  const widthVal = useSharedValue(count > 0 ? targetActiveWidth : targetIdleWidth);
  const bgOpacity = useSharedValue(count > 0 ? 1 : 0);
  const countScale = useSharedValue(count > 0 ? 1 : 0);
  const countOpacity = useSharedValue(count > 0 ? 1 : 0);
  const addTextOpacity = useSharedValue(count > 0 ? 0 : 1);

  useEffect(() => {
    if (count > 0) {
      widthVal.value = withTiming(targetActiveWidth, { duration: 120 });
      bgOpacity.value = withTiming(1, { duration: 120 });
      addTextOpacity.value = withTiming(0, { duration: 80 });
      countScale.value = withTiming(1, { duration: 120 });
      countOpacity.value = withTiming(1, { duration: 120 });
    } else {
      widthVal.value = withTiming(targetIdleWidth, { duration: 120 });
      bgOpacity.value = withTiming(0, { duration: 120 });
      addTextOpacity.value = withTiming(1, { duration: 80 });
      countScale.value = withTiming(0, { duration: 80 });
      countOpacity.value = withTiming(0, { duration: 80 });
    }
  }, [count, targetIdleWidth, targetActiveWidth, widthVal, bgOpacity, addTextOpacity, countScale, countOpacity]);

  const handleIncrement = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();

    const res = addItem({
      serviceId,
      serviceName,
      price,
      workerId: workerId || undefined,
      workerName: workerName || undefined,
      workerAvatar,
      workerRating,
      workerCategory,
      isVerified,
    });

    if (res.hasConflict) {
      setShowConflictModal(true);
      return;
    }

    if (onAdd) onAdd();
  };

  const handleDecrement = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();

    if (count > 0) {
      updateQuantity(serviceId, count - 1);
      if (onRemove) onRemove();
    }
  };

  const handleInitialAdd = (e: any) => {
    e.stopPropagation();

    const res = addItem({
      serviceId,
      serviceName,
      price,
      workerId: workerId || undefined,
      workerName: workerName || undefined,
      workerAvatar,
      workerRating,
      workerCategory,
      isVerified,
    });

    if (res.hasConflict) {
      setShowConflictModal(true);
      return;
    }

    if (onAdd) onAdd();
  };

  const handleConfirmReplaceCart = () => {
    setShowConflictModal(false);
    replaceCart({
      serviceId,
      serviceName,
      price,
      workerId: workerId || undefined,
      workerName: workerName || undefined,
      workerAvatar,
      workerRating,
      workerCategory,
      isVerified,
    });
    if (onAdd) onAdd();
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    width: widthVal.value,
    backgroundColor: bgOpacity.value > 0.5 ? colors.primary : 'transparent',
    borderColor: colors.primary,
    borderWidth: bgOpacity.value > 0.5 ? 0 : 1.5,
  }));

  const addTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: addTextOpacity.value,
    display: addTextOpacity.value === 0 ? 'none' : 'flex',
  }));

  const countControlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: countOpacity.value,
    transform: [{ scale: countScale.value }],
    display: countOpacity.value === 0 ? 'none' : 'flex',
  }));

  const labelSize = isSm ? 13 : 14;

  return (
    <>
      <AnimatedPressable
        style={[
          styles.buttonContainer,
          { height: buttonHeight },
          animatedButtonStyle,
          style,
        ]}
        onPress={count === 0 ? handleInitialAdd : undefined}
        accessibilityRole="button"
        accessibilityLabel={
          count === 0
            ? `Add ${serviceName} to cart`
            : `${count} ${serviceName} in cart. Tap to change quantity.`
        }
      >
        {count === 0 ? (
          <Animated.View style={[styles.innerAddWrapper, addTextAnimatedStyle]}>
            <Text style={[styles.addSymbol, { fontSize: labelSize + 1 }]}>+</Text>
            <Text style={[styles.addText, { fontSize: labelSize }]}>Add</Text>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.innerControlsWrapper, countControlsAnimatedStyle]}>
            <Pressable
              style={styles.controlZone}
              onPress={handleDecrement}
              hitSlop={8}
              accessibilityLabel="Decrease quantity"
            >
              <Text style={styles.controlText}>−</Text>
            </Pressable>

            <View style={styles.countWrapper}>
              <Text style={styles.countText}>{count}</Text>
            </View>

            <Pressable
              style={styles.controlZone}
              onPress={handleIncrement}
              hitSlop={8}
              accessibilityLabel="Increase quantity"
            >
              <Text style={styles.controlText}>+</Text>
            </Pressable>
          </Animated.View>
        )}
      </AnimatedPressable>

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
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    overflow: 'hidden',
  },
  innerAddWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    height: '100%',
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
  innerControlsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
  },
  controlZone: {
    width: 32,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: 16,
    color: colors.textOnGreen,
    includeFontPadding: false,
  },
  countWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: 15,
    color: colors.textOnGreen,
    includeFontPadding: false,
  },
});
