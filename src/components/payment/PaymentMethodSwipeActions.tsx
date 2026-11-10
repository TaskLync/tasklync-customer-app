import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { PaymentMethod } from '../../types/payment.types';
import { fontFamily, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { showAlert } from '../feedback/AppAlert';

export interface PaymentMethodSwipeActionsProps {
  method: PaymentMethod;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

export const PaymentMethodSwipeActions: React.FC<PaymentMethodSwipeActionsProps> = ({
  method,
  onDelete,
  children,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const swipeableRef = useRef<Swipeable>(null);

  // Cash on Delivery cannot be deleted
  if (method.is_fixed || method.type === 'cash') {
    return <View style={styles.wrapper}>{children}</View>;
  }

  const handleDeletePress = () => {
    swipeableRef.current?.close();

    if (method.is_default) {
      // Soft confirmation for default payment method
      showAlert(
        'Delete Default Method?',
        'This is currently set as your default payment method. Are you sure you want to remove it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onDelete(method.id);
            },
          },
        ]
      );
    } else {
      onDelete(method.id);
    }
  };

  const renderRightActions = () => {
    return (
      <View style={styles.rightActionContainer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.deleteButton}
          onPress={handleDeletePress}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${method.title}`}
        >
          <Trash2 size={20} color={palette.pureWhite} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={35}
      overshootRight={false}
      renderRightActions={renderRightActions}
      containerStyle={styles.swipeContainer}
    >
      {children}
    </Swipeable>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm + 2,
  },
  swipeContainer: {
    marginBottom: spacing.sm + 2,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  rightActionContainer: {
    width: 70,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 70,
    height: '100%',
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    gap: 4,
  },
  deleteText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    color: palette.pureWhite,
  },
});
