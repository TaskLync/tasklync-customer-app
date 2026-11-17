import { SeeAllLink } from '../ui/Button/SeeAllLink';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../design/typography';
import { layout } from '../../design/spacing';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface SectionProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  paddingTop?: number;
  showDivider?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  title,
  actionLabel,
  onAction,
  children,
  paddingTop = 0,
  showDivider = false,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {showDivider && <View style={styles.divider} />}
      
      <View style={[styles.header, { paddingTop }]}>
        <Text style={styles.title}>{title}</Text>
        
        {actionLabel && (
          <SeeAllLink onPress={onAction} label={actionLabel} />
        )}
      </View>
      
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    marginBottom: 12,
  },
  title: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  content: {
    width: '100%',
  },
});
