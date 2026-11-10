import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
          <Pressable 
            onPress={onAction} 
            hitSlop={12}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
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
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13.5,
    color: colors.primary,
  },
  content: {
    width: '100%',
  },
});
