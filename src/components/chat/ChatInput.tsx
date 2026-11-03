import { colors, palette } from '../../design';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  Text,
  Alert,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Paperclip, ArrowUp, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compressImage } from '../../utils/imageCompression';

interface ChatInputProps {
  onSend?: (text: string, type?: 'text' | 'image', mediaUrl?: string) => void;
  onSendMessage?: (text: string) => void;
  bookingId?: string;
  isClosed?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * ChatInput Component
 *
 * Implements Day 29 Media Pipeline & Interaction Standards:
 * - Direct, cross-platform animated ActionSheet Bottom Sheet Modal:
 *   2 clear options: "Take Photo" | "Choose from Gallery" (Hick's Law)
 * - Compression Pipeline: Runs image through imageCompression before handing off to upload
 * - Send Button: Smooth Reanimated color transition
 * - Expanding multiline input with safe area handling
 */
export const ChatInput = React.memo(function ChatInput({
  onSend,
  onSendMessage,
  onTyping,
  onStopTyping,
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState<string>('');
  const [inputHeight, setInputHeight] = useState<number>(40);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Send button animation progress (0: empty/disabled, 1: has text/active)
  const sendProgress = useSharedValue(0);

  const handleChangeText = (val: string) => {
    setText(val);
    if (val.trim().length > 0) {
      sendProgress.value = withTiming(1, { duration: 150 });
      onTyping?.();
    } else {
      sendProgress.value = withTiming(0, { duration: 150 });
      onStopTyping?.();
    }
  };

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;
    const toSend = text;
    setText('');
    sendProgress.value = withTiming(0, { duration: 150 });
    onStopTyping?.();
    if (typeof onSend === 'function') {
      onSend(toSend, 'text');
    } else if (typeof onSendMessage === 'function') {
      onSendMessage(toSend);
    }
  }, [text, disabled, onSend, onSendMessage, onStopTyping, sendProgress]);

  // Image Attachment Picker with Compression
  const handlePickedImage = async (uri: string) => {
    try {
      const compressed = await compressImage(uri);
      onSend?.('', 'image', compressed.uri);
    } catch {
      onSend?.('', 'image', uri);
    }
  };

  const pickImageFromCamera = async () => {
    setIsMediaModalVisible(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera access in your device settings to capture photos for chat.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await handlePickedImage(result.assets[0].uri);
      }
    } catch (err) {
      if (__DEV__) console.warn('[ChatInput] Camera error:', err);
    }
  };

  const pickImageFromGallery = async () => {
    setIsMediaModalVisible(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photo Library Permission Required', 'Please allow photo library access in your device settings to attach photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await handlePickedImage(result.assets[0].uri);
      }
    } catch (err) {
      if (__DEV__) console.warn('[ChatInput] Gallery error:', err);
    }
  };

  const handleAttachPress = () => {
    Keyboard.dismiss();
    setIsMediaModalVisible(true);
  };

  // Reanimated style for Send Button (Color transition using withTiming 150ms)
  const sendButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      sendProgress.value,
      [0, 1],
      [palette.gray100, colors.primaryDark]
    );

    return {
      backgroundColor,
    };
  });

  const sendIconColor = text.trim().length > 0 ? colors.white : colors.textMuted;

  return (
    <>
      <View
        style={[
          styles.wrapper,
          {
            paddingBottom: isKeyboardVisible
              ? 8
              : insets.bottom > 0
              ? insets.bottom + 10
              : 14,
          },
        ]}
      >
        <View style={styles.container}>
          {/* Attachment Button (44px touch target) */}
          <Pressable
            style={({ pressed }) => [styles.attachButton, pressed && styles.buttonPressed]}
            onPress={handleAttachPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Attach photo"
            accessibilityRole="button"
          >
            <Paperclip size={22} color={colors.textSecondary} />
          </Pressable>

          {/* Input Text Box (grows 40px to 100px max) */}
          <TextInput
            style={[styles.input, { height: Math.min(Math.max(40, inputHeight), 100) }]}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={handleChangeText}
            multiline
            maxLength={1000}
            onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
            editable={!disabled}
          />

          {/* Send Button (44px touch target) */}
          <AnimatedPressable
            style={[styles.sendButton, sendButtonStyle]}
            onPress={handleSend}
            disabled={!text.trim() || disabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <ArrowUp size={18} color={sendIconColor} strokeWidth={2.5} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Cross-Platform High-Performance Media ActionSheet Bottom Sheet */}
      <Modal
        visible={isMediaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMediaModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsMediaModalVisible(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attach Photo</Text>
              <Pressable
                onPress={() => setIsMediaModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.modalCloseButton}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalOptionsContainer}>
              {/* Option 1: Camera */}
              <Pressable
                style={({ pressed }) => [
                  styles.mediaOption,
                  pressed && styles.mediaOptionPressed,
                ]}
                onPress={pickImageFromCamera}
                accessibilityRole="button"
                accessibilityLabel="Take photo with camera"
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.infoLight }]}>
                  <Camera size={22} color={colors.textInfo} strokeWidth={2.2} />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtitle}>Use camera to capture image</Text>
                </View>
              </Pressable>

              {/* Option 2: Gallery */}
              <Pressable
                style={({ pressed }) => [
                  styles.mediaOption,
                  pressed && styles.mediaOptionPressed,
                ]}
                onPress={pickImageFromGallery}
                accessibilityRole="button"
                accessibilityLabel="Choose from photo library"
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
                  <ImageIcon size={22} color={colors.primaryDark} strokeWidth={2.2} />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionTitle}>Choose from Gallery</Text>
                  <Text style={styles.optionSubtitle}>Select from your photos</Text>
                </View>
              </Pressable>
            </View>

            {/* Cancel Button */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={() => setIsMediaModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.bgSubtle,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  attachButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginBottom: 1,
  },
  input: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: colors.textPrimary,
    paddingTop: Platform.OS === 'ios' ? 9 : 8,
    paddingBottom: Platform.OS === 'ios' ? 9 : 8,
    paddingHorizontal: 8,
    maxHeight: 100,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 4,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionsContainer: {
    gap: 10,
    marginBottom: 14,
  },
  mediaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mediaOptionPressed: {
    backgroundColor: colors.bgHover,
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.bgHover,
    marginTop: 4,
  },
  cancelButtonPressed: {
    backgroundColor: colors.borderLight,
  },
  cancelButtonText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
