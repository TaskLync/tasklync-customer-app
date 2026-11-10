import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { fontFamily } from '../../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface ScheduleHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  title = 'Choose date & time',
  subtitle,
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
    <View style={styles.container}>
      <Pressable
        onPress={handleBack}
        style={styles.backButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={26} color={colors.textPrimary} strokeWidth={2.2} />
      </Pressable>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.bgCard,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 4,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
});