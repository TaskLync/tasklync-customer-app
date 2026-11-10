import { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Pencil, Trash2 } from 'lucide-react-native';
import { Address } from '../../types/address.types';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface AddressSwipeActionsProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  children: React.ReactNode;
}

export const AddressSwipeActions: React.FC<AddressSwipeActionsProps> = ({
  address,
  onEdit,
  onDelete,
  children,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const swipeableRef = useRef<Swipeable | null>(null);

  const handleEdit = () => {
    swipeableRef.current?.close();
    onEdit(address);
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete(address);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-140, 0],
      outputRange: [0, 140],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.actionsContainer,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        {/* Edit Button (70px blue) */}
        <Pressable
          onPress={handleEdit}
          style={[styles.actionButton, styles.editButton]}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${address.label || 'address'}`}
        >
          <Pencil size={18} color={palette.pureWhite} strokeWidth={2.4} />
          <Text style={styles.actionText} maxFontSizeMultiplier={1.3}>
            Edit
          </Text>
        </Pressable>

        {/* Delete Button (70px red) */}
        <Pressable
          onPress={handleDelete}
          style={[styles.actionButton, styles.deleteButton]}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${address.label || 'address'}`}
        >
          <Trash2 size={18} color={palette.pureWhite} strokeWidth={2.4} />
          <Text style={styles.actionText} maxFontSizeMultiplier={1.3}>
            Delete
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        renderRightActions={renderRightActions}
        containerStyle={styles.swipeContainer}
      >
        {children}
      </Swipeable>
    </View>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  swipeContainer: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  actionsContainer: {
    width: 140,
    flexDirection: 'row',
    height: 76,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  actionButton: {
    width: 70,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: palette.info,
  },
  deleteButton: {
    backgroundColor: palette.danger,
  },
  actionText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    lineHeight: 16,
    color: palette.pureWhite,
    marginTop: 3,
  },
});
