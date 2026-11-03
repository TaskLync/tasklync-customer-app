import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BottomSheet, BottomSheetRef } from '../BottomSheet';
import { colors, palette } from '../../../design/colors';
import { typography } from '../../../design/typography';

export interface ActionItem {
  label: string;
  icon?: any; // LucideIcon
  variant?: 'default' | 'danger' | 'disabled';
  onPress: () => void;
}

interface ActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionItem[];
  cancelLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isVisible,
  onClose,
  title,
  actions,
  cancelLabel = 'Cancel',
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const prevVisible = useRef(isVisible);

  useEffect(() => {
    if (isVisible && !prevVisible.current) {
      sheetRef.current?.open();
    } else if (!isVisible && prevVisible.current) {
      sheetRef.current?.close();
    }
    prevVisible.current = isVisible;
  }, [isVisible]);

  const sheetHeight = React.useMemo(() => {
    const titleH = title ? 48 : 0;
    const actionsH = actions.length * 52;
    const cancelH = 60;
    const paddingAndHandle = 56;
    return titleH + actionsH + cancelH + paddingAndHandle;
  }, [title, actions.length]);

  const handleActionPress = (action: ActionItem) => {
    if (action.variant === 'disabled') return;
    action.onPress();
    sheetRef.current?.close();
  };

  const handleCancel = () => {
    sheetRef.current?.close();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={[sheetHeight]}
      onClose={onClose}
      contentPadding={false}
    >
      <View style={styles.container}>
        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>{title}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isLast = index === actions.length - 1;

            return (
              <Pressable
                key={`${action.label}-${index}`}
                onPress={() => handleActionPress(action)}
                disabled={action.variant === 'disabled'}
                style={({ pressed }) => [
                  styles.actionRow,
                  !isLast && styles.actionRowBorder,
                  pressed && action.variant !== 'disabled' && styles.actionRowPressed,
                ]}
              >
                {Icon && (
                  <Icon
                    size={20}
                    color={
                      action.variant === 'danger'
                        ? palette.danger
                        : action.variant === 'disabled'
                        ? colors.textMuted
                        : colors.textPrimary
                    }
                    style={styles.icon}
                  />
                )}
                <Text
                  style={[
                    styles.actionLabel,
                    action.variant === 'danger' && styles.labelDanger,
                    action.variant === 'disabled' && styles.labelDisabled,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed,
          ]}
        >
          <Text style={styles.cancelLabel}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  titleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  titleText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
  actionsContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.bgCard,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionRowPressed: {
    backgroundColor: colors.bgSection,
  },
  icon: {
    marginRight: 12,
  },
  actionLabel: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  labelDanger: {
    color: palette.danger,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  cancelButton: {
    height: 52,
    backgroundColor: colors.bgSection,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButtonPressed: {
    backgroundColor: colors.border,
  },
  cancelLabel: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
});
