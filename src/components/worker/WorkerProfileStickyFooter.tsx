import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, useColorScheme } from 'react-native';
import { MessageCircle, Calendar, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '../../design/typography';
import { colors, palette } from '../../design/colors';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Standardized edge-to-edge system navigation clearance (Uber/Careem/Foodpanda UX spec):
  // When insets.bottom > 0 (Android 3-button nav, gesture navigation bar, or iOS home indicator),
  // we add 14px of ergonomic breathing room above the system bar so buttons never collide with system UI.
  // When insets.bottom is 0 (hardware navigation keys or older devices), we use a safe 20px baseline.
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 14 : 20;

  const handleChatPress = () => {
    onChat();
  };

  const handleBookPress = () => {
    onBookNow();
  };

  return (
    <View
      style={[
        styles.container,
        isDark && styles.containerDark,
        { paddingBottom: bottomPadding },
        style,
      ]}
    >
      {/* Chat Pill Button */}
      <Pressable
        onPress={handleChatPress}
        style={({ pressed }) => [
          styles.chatButton,
          isDark && styles.chatButtonDark,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={workerName ? `Chat with ${workerName}` : 'Chat with worker'}
      >
        <MessageCircle size={18} color={isDark ? palette.green400 : colors.primaryDark} strokeWidth={2.2} />
        <Text style={[styles.chatText, isDark && styles.chatTextDark]}>Chat</Text>
      </Pressable>

      {/* Book Now Pill Button */}
      <Pressable
        onPress={handleBookPress}
        disabled={!isWorkerAvailable}
        style={({ pressed }) => [
          styles.bookButton,
          !isWorkerAvailable && (isDark ? styles.bookButtonDisabledDark : styles.bookButtonDisabled),
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={workerName ? `Book Now with ${workerName}` : 'Book Now'}
      >
        <Calendar size={18} color={colors.white} strokeWidth={2.2} />
        <Text style={styles.bookText}>Book Now</Text>
        <ArrowRight size={16} color={colors.white} strokeWidth={2.4} style={styles.arrowIcon} />
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
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  containerDark: {
    backgroundColor: palette.slate800,
    borderColor: palette.slate700,
    shadowOpacity: 0.25,
  },
  chatButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chatButtonDark: {
    backgroundColor: palette.slate900,
    borderColor: colors.primary,
  },
  chatText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.primaryDark,
  },
  chatTextDark: {
    color: palette.green400,
  },
  bookButton: {
    flex: 1.8,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  bookButtonDisabled: {
    backgroundColor: colors.textMuted,
    shadowOpacity: 0,
  },
  bookButtonDisabledDark: {
    backgroundColor: palette.slate600,
    shadowOpacity: 0,
  },
  bookText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 15,
    color: colors.white,
  },
  arrowIcon: {
    marginLeft: 2,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
