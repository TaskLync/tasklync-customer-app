import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ViewStyle,
} from 'react-native';
import { typography } from '../../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

interface StickyListHeaderProps {
  title: string;
  count?: number | null;
  subtitle?: string | null;
  rightContent?: React.ReactNode | null;
  style?: ViewStyle;
  bgColor?: string;
}

export const StickyListHeader: React.FC<StickyListHeaderProps> = ({
  title,
  count = null,
  subtitle = null,
  rightContent = null,
  style,
  bgColor: bgColorProp,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const bgColor = bgColorProp ?? colors.bgApp;
  return (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <View style={styles.topRow}>
        <View style={styles.titleWrapper}>
          <Text style={styles.titleText}>
            {title}
            {count !== null && (
              <Text style={styles.countText}>
                {' '}({count})
              </Text>
            )}
          </Text>
        </View>

        {rightContent && (
          <View style={styles.rightContainer}>
            {rightContent}
          </View>
        )}
      </View>

      {subtitle && (
        <Text style={styles.subtitleText}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrapper: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  countText: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitleText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
