import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '../home/NotificationBell';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/** Large-title header shared in spirit with Messages: one title, one quiet action. */
export function BookingsHeader() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 10 }]}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.2}>
        My Bookings
      </Text>
      <NotificationBell size={44} iconSize={22} />
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 20,
      paddingRight: 8,
      paddingBottom: 14,
      backgroundColor: colors.bgCard,
    },
    title: {
      flexShrink: 1,
      fontFamily: typography.fontFamily.jakarta.bold,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.8,
      color: colors.textPrimary,
    },
  });
