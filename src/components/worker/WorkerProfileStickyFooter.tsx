import React from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, ViewStyle } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

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
  /** Book Now was tapped and is being processed: blocks repeat taps and shows progress. */
  isStarting?: boolean;
  /** Inline, dismissible-by-next-tap explanation (unavailable worker, no bookable services, ...). */
  notice?: { text: string; actionLabel?: string | undefined; onAction?: (() => void) | undefined } | null;
  style?: ViewStyle;
}

export const WorkerProfileStickyFooter: React.FC<WorkerProfileStickyFooterProps> = ({
  workerName,
  onChat,
  onBookNow,
  isWorkerAvailable,
  isStarting = false,
  notice = null,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingBottom: getBottomPadding(insets.bottom) }, style]}
    >
      {notice ? (
        <View style={styles.notice} accessibilityLiveRegion="polite" accessible accessibilityLabel={notice.text}>
          <Text style={styles.noticeText}>{notice.text}</Text>
          {notice.actionLabel && notice.onAction ? (
            <Pressable onPress={notice.onAction} hitSlop={8} accessibilityRole="button">
              <Text style={styles.noticeAction}>{notice.actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {/* Secondary: Chat */}
      <Pressable
        onPress={onChat}
        style={({ pressed }) => [styles.button, styles.chatButton, pressed && styles.chatPressed]}
        accessibilityRole="button"
        accessibilityLabel={workerName ? `Chat with ${workerName}` : 'Chat with worker'}
      >
        <MessageCircle size={18} color={colors.textPrimary} strokeWidth={2.2} />
        <Text style={[styles.chatText]}>Chat</Text>
      </Pressable>

      {/* Primary: Book Now */}
      <Pressable
        onPress={onBookNow}
        disabled={isStarting}
        style={({ pressed }) => [
          styles.button,
          styles.bookButton,
          !isWorkerAvailable && (styles.bookButtonDisabled),
          pressed && styles.bookPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isStarting, busy: isStarting }}
        accessibilityLabel={workerName ? `Book Now with ${workerName}` : 'Book Now'}
      >
        {isStarting ? (
          <ActivityIndicator size="small" color={colors.pureWhite} />
        ) : (
          <Text style={styles.bookText}>{isWorkerAvailable ? 'Book Now' : 'Unavailable'}</Text>
        )}
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
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
  chatPressed: {
    backgroundColor: colors.bgHover,
  },
  chatText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bookButton: {
    flex: 2,
    backgroundColor: colors.primaryDark,
  },
  bookPressed: {
    opacity: 0.88,
  },
  notice: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: '100%',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  noticeAction: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  bookButtonDisabled: {
    backgroundColor: colors.textDisabled,
  },
  bookText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 15.5,
    letterSpacing: -0.1,
    color: colors.pureWhite,
  },
});
