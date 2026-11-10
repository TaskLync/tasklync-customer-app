import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface PaymentHeaderProps {
  title?: string;
  onBack?: () => void;
}

export const PaymentHeader: React.FC<PaymentHeaderProps> = ({
  title = 'Payment',
  onBack,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Symmetrical placeholder for true visual centering */}
      <View style={styles.rightPlaceholder} pointerEvents="none" />
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: colors.bgApp,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  backButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  title: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  rightPlaceholder: {
    width: 40,
    height: 40,
  },
});
