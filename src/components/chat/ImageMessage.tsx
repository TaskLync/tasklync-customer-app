import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Modal,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { RotateCcw, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Message } from '../../types/chat.types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ImageMessageProps {
  message: Message;
  progress?: number | undefined;
  onRetry?: ((messageId: string) => void) | undefined;
  onPress?: ((uri: string) => void) | undefined;
  isOutgoing?: boolean | undefined;
}

const RING_SIZE = 48;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * ImageMessage Component
 *
 * Implements Day 29 Media Pipeline & UX Standards:
 * - blurhash placeholder support for recipient / cached network images
 * - Real 0->100% circular progress ring overlay with linear timing (withTiming, Easing.linear)
 * - Sender immediate local rendering (zero flicker)
 * - Fitts's Law: 48px centered circular tap target for failed upload recovery
 * - Peak-End Rule / Zero Anxiety: Failed upload never disappears; stays in thread
 * - Fullscreen Modal Image Viewer on tap of sent image
 */
export const ImageMessage = React.memo(function ImageMessage({
  message,
  progress = 0,
  onRetry,
  onPress,
  isOutgoing = false,
}: ImageMessageProps) {
  const insets = useSafeAreaInsets();
  const [isViewerVisible, setIsViewerVisible] = useState<boolean>(false);

  const isUploading = message.status === 'sending';
  const isFailed = message.status === 'failed';
  const imageUri = message.media_url || message.media_thumbnail_url || '';

  // Progress animation (0 to 1) - linear easing matching real upload progress
  const animatedProgress = useSharedValue(progress / 100);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(1, Math.max(0, progress / 100)), {
      duration: 160,
      easing: Easing.linear,
    });
  }, [progress, animatedProgress]);

  const circleAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = CIRCUMFERENCE * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  const handleImagePress = useCallback(() => {
    if (isUploading || isFailed || !imageUri) return;
    if (onPress) {
      onPress(imageUri);
    } else {
      setIsViewerVisible(true);
    }
  }, [isUploading, isFailed, imageUri, onPress]);

  const handleRetryPress = useCallback(() => {
    const targetId = message.temp_id || message.id;
    if (targetId && onRetry) {
      onRetry(targetId);
    }
  }, [message.temp_id, message.id, onRetry]);

  return (
    <>
      <View style={styles.container}>
        <Pressable
          onPress={handleImagePress}
          disabled={isUploading || isFailed}
          style={styles.imagePressable}
          accessibilityRole="imagebutton"
          accessibilityLabel={isUploading ? "Uploading photo" : isFailed ? "Photo failed to upload, tap to retry" : "Chat photo, tap to view full screen"}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            cachePolicy="memory-disk"
          />

          {/* Uploading Progress Ring Overlay */}
          {isUploading && (
            <View style={styles.overlay}>
              <View style={styles.progressContainer}>
                <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
                  {/* Background Ring */}
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                  />
                  {/* Active Progress Ring */}
                  <AnimatedCircle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke="#FFFFFF"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    animatedProps={circleAnimatedProps}
                    strokeLinecap="round"
                  />
                </Svg>
                {progress > 0 && (
                  <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                )}
              </View>
            </View>
          )}

          {/* Failed State: Dimmed Overlay + Fitts's Law 48px Centered Retry Button */}
          {isFailed && (
            <View style={[styles.overlay, styles.failedOverlay]}>
              <Pressable
                style={({ pressed }) => [
                  styles.retryCircleButton,
                  pressed && styles.retryButtonPressed,
                ]}
                onPress={handleRetryPress}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Retry photo upload"
              >
                <RotateCcw size={22} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.failedBadgeText}>Tap to retry</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={isViewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsViewerVisible(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.viewerContainer}>
          {/* Close Button Header with Safe Area Insets */}
          <View style={[styles.viewerHeader, { paddingTop: Math.max(insets.top, 16) }]}>
            <Pressable
              style={styles.closeButton}
              onPress={() => setIsViewerVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close photo viewer"
            >
              <X size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Full Screen Image Presentation */}
          <View style={styles.viewerImageWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.fullscreenImage}
              contentFit="contain"
              transition={200}
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  imagePressable: {
    position: 'relative',
    width: 220,
    height: 165,
    borderRadius: 14,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  svg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  progressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  retryCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonPressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: '#DC2626',
  },
  failedBadgeText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
