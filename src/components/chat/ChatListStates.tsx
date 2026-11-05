import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { colors } from '../../design';

/** Shown at the top of the history while an older page is being fetched. */
export const LoadingOlder = React.memo(function LoadingOlder() {
  return (
    <View style={styles.loadingOlder} accessibilityLabel="Loading earlier messages">
      <ActivityIndicator size="small" color={colors.textMuted} />
    </View>
  );
});

interface EmptyConversationProps {
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Genuinely empty conversation (loaded, zero messages).
 *
 * Used as ListEmptyComponent of the chats' *inverted* FlatList. The list flips its content
 * (scaleY -1 on iOS, scale -1 on Android) and un-flips the empty component by cloning it with
 * `style` = inversion transform (+ an `onLayout` it relies on). Both props MUST reach the root
 * View — dropping them is what rendered this state upside down.
 */
export const EmptyConversation = React.memo(function EmptyConversation({
  style,
  onLayout,
}: EmptyConversationProps) {
  return (
    <View style={[styles.empty, style]} onLayout={onLayout}>
      <View style={styles.emptyIcon}>
        <MessageCircle size={22} color={colors.primaryDark} strokeWidth={2} />
      </View>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Send a message to start the conversation.</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  loadingOlder: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
