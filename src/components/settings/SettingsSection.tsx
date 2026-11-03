import React, { Children, isValidElement, Fragment } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, colors, fontFamily, spacing } from '../../design';

export interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.3}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.cardContainer}>
        {Children.map(children, (child, index) => {
          if (!isValidElement(child)) return child;
          const isLast = index === Children.count(children) - 1;
          return (
            <Fragment key={index}>
              {child}
              {!isLast && <View style={styles.divider} />}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: palette.gray500,
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  cardContainer: {
    backgroundColor: palette.white,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
    marginLeft: 48,
  },
});
