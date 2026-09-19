import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Copy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let ClipboardModule: any = null;
try {
  ClipboardModule = require('expo-clipboard');
} catch {
  // Graceful fallback
}

export interface MessageContextMenuRef {
  showMenu: (content: string) => void;
  showCopiedToast: () => void;
}

export interface MessageContextMenuProps {
  onCopied?: () => void;
}

/**
 * MessageContextMenu Component
 *
 * Implements Day 29 UX & Usability Standards:
 * - Jakob's Law: Standard OS long-press text copy interaction
 * - Hick's Law: Single clear action ("Copy") - zero decision friction
 * - Feedback: Haptic confirmation + smooth "Copied" floating toast (Jakarta Medium 13)
 * - Platform Native: Uses ActionSheetIOS on iOS, clean bottom sheet/modal on Android
 */
export const MessageContextMenu = forwardRef<MessageContextMenuRef, MessageContextMenuProps>(
  function MessageContextMenu({ onCopied }, ref) {
    const insets = useSafeAreaInsets();
    const [isAndroidModalVisible, setIsAndroidModalVisible] = useState(false);
    const [pendingContent, setPendingContent] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<string>('Copied');
    const [isToastVisible, setIsToastVisible] = useState<boolean>(false);

    // Toast Animation Shared Values
    const toastOpacity = useSharedValue(0);
    const toastTranslateY = useSharedValue(20);

    const triggerToast = useCallback((msg = 'Copied') => {
      setToastMessage(msg);
      setIsToastVisible(true);

      toastOpacity.value = withTiming(1, { duration: 160 });
      toastTranslateY.value = withSpring(0, { damping: 16, stiffness: 260 });


      setTimeout(() => {
        toastOpacity.value = withTiming(0, { duration: 180 });
        toastTranslateY.value = withTiming(20, { duration: 180 });
        setTimeout(() => setIsToastVisible(false), 200);
      }, 1500);
    }, [toastOpacity, toastTranslateY]);

    const copyToClipboard = useCallback(
      async (text: string) => {
        try {
          if (ClipboardModule?.setStringAsync) {
            await ClipboardModule.setStringAsync(text);
          } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
          }
        } catch {
          // Fallback safe
        }
        triggerToast('Copied');
        onCopied?.();
      },
      [triggerToast, onCopied]
    );

    const showMenu = useCallback(
      (content: string) => {
        if (!content || !content.trim()) return;


        if (Platform.OS === 'ios') {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options: ['Cancel', 'Copy'],
              cancelButtonIndex: 0,
            },
            (buttonIndex) => {
              if (buttonIndex === 1) {
                copyToClipboard(content);
              }
            }
          );
        } else {
          setPendingContent(content);
          setIsAndroidModalVisible(true);
        }
      },
      [copyToClipboard]
    );

    useImperativeHandle(ref, () => ({
      showMenu,
      showCopiedToast: () => triggerToast('Copied'),
    }));

    const toastAnimatedStyle = useAnimatedStyle(() => ({
      opacity: toastOpacity.value,
      transform: [{ translateY: toastTranslateY.value }],
    }));

    return (
      <>
        {/* Android / Web Action Modal */}
        {Platform.OS !== 'ios' && (
          <Modal
            visible={isAndroidModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsAndroidModalVisible(false)}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setIsAndroidModalVisible(false)}
            >
              <View
                style={[
                  styles.modalContent,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.menuOption,
                    pressed && styles.menuOptionPressed,
                  ]}
                  onPress={() => {
                    setIsAndroidModalVisible(false);
                    copyToClipboard(pendingContent);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Copy text"
                >
                  <Copy size={18} color="#1E293B" strokeWidth={2} style={styles.optionIcon} />
                  <Text style={styles.optionText}>Copy</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.cancelOption,
                    pressed && styles.menuOptionPressed,
                  ]}
                  onPress={() => setIsAndroidModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        )}

        {/* Global Copied Toast (Jakarta Medium 13) */}
        {isToastVisible && (
          <Animated.View
            pointerEvents="none"
            style={[styles.toastContainer, toastAnimatedStyle]}
          >
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}
      </>
    );
  }
);

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  menuOptionPressed: {
    backgroundColor: '#F1F5F9',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: '#0F172A',
  },
  cancelOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: '#64748B',
  },
  toastContainer: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
