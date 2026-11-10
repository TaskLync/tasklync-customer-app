import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BookingStatus } from '../../types/booking.types';
import { bookingActionsMap, BookingActionConfig } from '../../utils/bookingActionsMap';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookingActionsProps {
  status: BookingStatus;
  onAction: (action: string) => void;
}

export function BookingActions({ status, onAction }: BookingActionsProps) {
  const styles = useThemedStyles(createStyles);
  const actions = bookingActionsMap[status];

  if (!actions || actions.length === 0) return null;

  return (
    <View style={styles.container}>
      {actions.map((actionConfig: BookingActionConfig, index: number) => {
        const isPrimary = actionConfig.variant === 'primary';
        const isDanger = actionConfig.variant === 'danger';
        
        const buttonStyle = isPrimary
          ? styles.buttonPrimary
          : isDanger
          ? styles.buttonDanger
          : styles.buttonSecondary;

        const textStyle = isPrimary
          ? styles.textPrimary
          : isDanger
          ? styles.textDanger
          : styles.textSecondary;

        return (
          <Pressable
            key={actionConfig.action}
            style={({ pressed }) => [
              styles.button,
              buttonStyle,
              index > 0 && styles.buttonMargin,
              pressed && { opacity: 0.85 }
            ]}
            onPress={() => onAction(actionConfig.action)}
          >
            <Text 
              style={[styles.text, textStyle]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {actionConfig.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 12,
  },
  button: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  buttonMargin: {
    marginLeft: 10,
  },
  buttonPrimary: {
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
  },
  textPrimary: {
    color: colors.pureWhite,
  },
  textSecondary: {
    color: colors.textPrimary,
  },
  textDanger: {
    color: colors.dangerMedium,
  },
});
