import { FC } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CartHeaderProps {
  itemCount: number;
}

export const CartHeader: FC<CartHeaderProps> = ({ itemCount }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.header}>
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        onPress={handleBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={22} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.titleContainer}>
        {/* Poppins font for header title */}
        <Text style={styles.titleText}>Cart</Text>

        {itemCount > 0 && (
          <View style={styles.badgePill}>
            {/* Inter font for numerical count pill */}
            <Text style={styles.badgeText}>{itemCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.rightPlaceholder} />
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: colors.bgSection,
    transform: [{ scale: 0.96 }],
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: typography.fontSize.h3,
    color: colors.textPrimary,
  },
  badgePill: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  badgeText: {
    fontFamily: typography.fontFamily.inter.bold,
    fontSize: typography.fontSize.micro,
    color: colors.primaryDark,
  },
  rightPlaceholder: {
    width: 40,
  },
});
