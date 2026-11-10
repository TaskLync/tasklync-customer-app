import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { Users } from 'lucide-react-native';
import { fontFamily as fonts } from '@design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface WorkerSocialProofProps {
  jobCount: number;
  city: string | null;
  style?: ViewStyle;
}

export const WorkerSocialProof = ({
  jobCount,
  city,
  style,
}: WorkerSocialProofProps) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const formatJobCount = (count: number) => {
    if (count > 1000) return `${(count / 1000).toFixed(1)}k+`;
    if (count > 100) return `${count}`;
    if (count > 10) return `${Math.floor(count / 10) * 10}+`;
    return `${count}`;
  };

  const formattedCount = formatJobCount(jobCount);

  return (
    <View style={[styles.container, style]}>
      <Users size={16} color={colors.primary} />
      <Text style={styles.textContainer}>
        <Text style={styles.mutedText}>Trusted by </Text>
        <Text style={styles.highlightText}>{formattedCount}</Text>
        <Text style={styles.mutedText}> customers</Text>
        {city && (
          <>
            <Text style={styles.mutedText}> in </Text>
            <Text style={styles.cityText}>{city}</Text>
          </>
        )}
      </Text>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textContainer: {
    flex: 1,
    flexWrap: 'wrap',
  },
  mutedText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  highlightText: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cityText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
