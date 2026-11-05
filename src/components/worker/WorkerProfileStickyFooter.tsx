import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, useColorScheme } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '../../design/typography';
import { colors, palette } from '../../design/colors';

const BUTTON_HEIGHT = 52;
const PADDING_TOP = 12;

/** Bottom padding above the system bar / home indicator. */
const getBottomPadding = (insetBottom: number) => (insetBottom > 0 ? insetBottom + 8 : 16);

/** Total rendered height of the footer — use it to pad scroll content so nothing hides behind it. */
export const getWorkerProfileFooterHeight = (insetBottom: number) =>
  PADDING_TOP + BUTTON_HEIGHT + getBottomPadding(insetBottom);

interface WorkerProfileStickyFooterProps {
  workerId: string;
  workerName: string;
  onChat: () => void;
  onBookNow: () => void;
  isWorkerAvailable: boolean;
  style?: ViewStyle;
}

export const WorkerProfileStickyFooter: React.FC<WorkerProfileStickyFooterProps> = ({
  workerName,
  onChat,
  onBookNow,
  isWorkerAvailable,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.container,
        isDark && styles.containerDark,
        { paddingBottom: getBottomPadding(insets.bottom) },
        style,
      ]}
    >
      {/* Secondary: Chat */}
      <Pressable
        onPress={onChat}
        style={({ pressed }) => [
          styles.button,
          styles.chatButton,
          isDark && styles.chatButtonDark,
          pressed && styles.chatPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={workerName ? `Chat with ${workerName}` : 'Chat with worker'}
      >
        <MessageCircle size={18} color={isDark ? palette.green400 : colors.textPrimary} strokeWidth={2.2} />
        <Text style={[styles.chatText, isDark && styles.chatTextDark]}>Chat</Text>
      </Pressable>

      {/* Primary: Book Now */}
      <Pressable
        onPress={onBookNow}
        disabled={!isWorkerAvailable}
        style={({ pressed }) => [
          styles.button,
          styles.bookButton,
          !isWorkerAvailable && (isDark ? styles.bookButtonDisabledDark : styles.bookButtonDisabled),
          pressed && styles.bookPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isWorkerAvailable }}
        accessibilityLabel={workerName ? `Book Now with ${workerName}` : 'Book Now'}
      >
        <Text style={styles.bookText}>Book Now</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: PADDING_TOP,
    backgroundColor: colors.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 100,
  },
  containerDark: {
    backgroundColor: palette.gray800,
    borderTopColor: palette.gray700,
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    flex: 1,
    gap: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatButtonDark: {
    backgroundColor: palette.gray900,
    borderColor: palette.gray700,
  },
  chatPressed: {
    backgroundColor: colors.bgHover,
  },
  chatText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chatTextDark: {
    color: palette.green400,
  },
  bookButton: {
    flex: 2,
    backgroundColor: colors.primaryDark,
  },
  bookPressed: {
    opacity: 0.88,
  },
  bookButtonDisabled: {
    backgroundColor: colors.textDisabled,
  },
  bookButtonDisabledDark: {
    backgroundColor: palette.gray600,
  },
  bookText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 15.5,
    letterSpacing: -0.1,
    color: colors.white,
  },
});
