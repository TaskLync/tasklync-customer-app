import { FC } from 'react';
import { StyleSheet, Text, Pressable, Platform } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface AddMoreServicesLinkProps {
  workerId?: string;
  onPress?: () => void;
}

export const AddMoreServicesLink: FC<AddMoreServicesLinkProps> = ({
  workerId,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (workerId) {
      router.push(`/worker/${workerId}`);
    } else {
      router.push('/(tabs)/explore');
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Add more services"
    >
      <Plus size={16} color={colors.primaryDark} style={styles.icon} />
      {/* Plus Jakarta Sans for helper link */}
      <Text style={styles.linkText}>Add more services</Text>
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  icon: {
    marginRight: 6,
  },
  linkText: {
    fontFamily: typography.fontFamily.jakarta.semiBold, // Plus Jakarta Sans
    fontSize: typography.fontSize.body2,
    color: colors.primaryDark,
  },
});
