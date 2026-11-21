import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface NotificationGroupHeaderProps {
  title: string;
  count?: number;
}

/** Small, quiet date section heading ("Today", "Yesterday", "Earlier"). Sticky, so it uses the page surface. */
export const NotificationGroupHeader: React.FC<NotificationGroupHeaderProps> = React.memo(
  function NotificationGroupHeader({ title }) {
    const styles = useThemedStyles(createStyles);
    return (
      <View style={styles.container} accessibilityRole="header">
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      </View>
    );
  }
);

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    backgroundColor: colors.bgCard,
  },
  title: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
