import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  useEffect,
  useRef,
} from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { BottomSheetHandle } from './BottomSheetHandle';
import { colors } from '../../../design/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Premium native spring physics (calibrated to Apple iOS Sheet & Material 3 dynamics)
const SHEET_SPRING = {
  damping: 26,
  stiffness: 280,
  mass: 0.8,
};

const CLOSE_SPRING = {
  damping: 28,
  stiffness: 300,
  mass: 0.8,
};

export interface BottomSheetContextType {
  scrollOffset: SharedValue<number>;
  isExpanded: boolean;
}

export const BottomSheetContext = createContext<BottomSheetContextType | null>(null);

export const useBottomSheetContext = () => useContext(BottomSheetContext);

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
  snapTo: (index: number) => void;
  expand: () => void;
  collapse: () => void;
}

export interface BottomSheetProps {
  /**
   * Optional controlled visibility. When provided, BottomSheet automatically handles
   * opening and closing animations cleanly when the boolean value changes.
   */
  visible?: boolean | undefined;
  snapPoints?: (string | number)[] | undefined;
  defaultSnapIndex?: number | undefined;
  onClose?: (() => void) | undefined;
  onSnapChange?: ((index: number) => void) | undefined;
  closeOnBackdropPress?: boolean | undefined;
  enablePanDownToClose?: boolean | undefined;
  contentPadding?: boolean | undefined;
  backdropOpacity?: number | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  handleStyle?: StyleProp<ViewStyle> | undefined;
  children: React.ReactNode;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      visible,
      snapPoints,
      defaultSnapIndex = 0,
      onClose,
      onSnapChange,
      closeOnBackdropPress = true,
      enablePanDownToClose = true,
      contentPadding = true,
      backdropOpacity = 0.45,
      style,
      handleStyle,
      children,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(Boolean(visible));
    const [measuredContentHeight, setMeasuredContentHeight] = useState(0);
    const [currentSnapIndex, setCurrentSnapIndex] = useState(defaultSnapIndex);

    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    // Use maximum of window height and screen height for safety against
    // translucent status/navigation bars in Android APK/release builds.
    const effectiveScreenHeight = useMemo(() => {
      const screenH = Dimensions.get('screen').height;
      return Math.max(windowHeight || 0, screenH || 0, 600);
    }, [windowHeight]);

    const maxAllowedHeight = Math.min(
      effectiveScreenHeight * 0.92,
      effectiveScreenHeight - Math.max(insets.top, 24) - 16
    ); // Safe top margin for status bar & notch/Dynamic Island

    // ── Snap Point Math ────────────────────────────────────────────────────────
    const parsedConfig = useMemo(() => {
      // 1. If explicit snap points are provided (not single 'auto')
      if (
        snapPoints &&
        snapPoints.length > 0 &&
        !(snapPoints.length === 1 && snapPoints[0] === 'auto')
      ) {
        const pixelHeights = snapPoints.map((point) => {
          if (typeof point === 'number') {
            return Math.min(Math.max(point + insets.bottom, 90), maxAllowedHeight);
          }
          if (point === 'auto') {
            return measuredContentHeight > 0
              ? Math.min(measuredContentHeight + 36, maxAllowedHeight)
              : Math.min(effectiveScreenHeight * 0.7, maxAllowedHeight);
          }
          if (typeof point === 'string' && point.endsWith('%')) {
            const pct = parseFloat(point) / 100;
            if (!isNaN(pct)) {
              return Math.min(Math.max(effectiveScreenHeight * pct, 90), maxAllowedHeight);
            }
          }
          const val = parseFloat(String(point));
          return !isNaN(val)
            ? Math.min(Math.max(val + insets.bottom, 90), maxAllowedHeight)
            : Math.min(effectiveScreenHeight * 0.7, maxAllowedHeight);
        });

        const uniqueHeights = Array.from(new Set(pixelHeights)).sort((a, b) => a - b);
        const maxHeight = uniqueHeights[uniqueHeights.length - 1];
        const snapYValues = uniqueHeights.map((h) => maxHeight - h);

        return {
          heights: uniqueHeights,
          snapYValues,
          maxContainerHeight: maxHeight,
          isAuto: false,
        };
      }

      // 2. Explicit Auto-height mode (['auto']):
      // Account for the 32px drag handle zone so the content area + paddingBottom is never clipped
      if (snapPoints && snapPoints.length === 1 && snapPoints[0] === 'auto') {
        const autoHeight =
          measuredContentHeight > 0
            ? Math.min(measuredContentHeight + 36, maxAllowedHeight)
            : Math.min(effectiveScreenHeight * 0.5, maxAllowedHeight);

        return {
          heights: [autoHeight],
          snapYValues: [0],
          maxContainerHeight: autoHeight,
          isAuto: true,
        };
      }

      // 3. Fallback when snapPoints is omitted: default to ['70%', '92%']
      const h70 = Math.round(Math.min(effectiveScreenHeight * 0.7, maxAllowedHeight));
      const h92 = Math.round(Math.min(effectiveScreenHeight * 0.92, maxAllowedHeight));
      const defaultHeights = [h70, h92];
      const maxHeight = h92;
      const snapYValues = [maxHeight - h70, 0];

      return {
        heights: defaultHeights,
        snapYValues,
        maxContainerHeight: maxHeight,
        isAuto: false,
      };
    }, [snapPoints, measuredContentHeight, maxAllowedHeight, effectiveScreenHeight, insets.bottom]);

    // ── Offscreen Closed Position ──────────────────────────────────────────────
    const closedYPosition = useMemo(() => {
      const baseHeight = parsedConfig.maxContainerHeight || effectiveScreenHeight * 0.7;
      return Math.max(baseHeight + insets.bottom + 120, effectiveScreenHeight);
    }, [parsedConfig.maxContainerHeight, insets.bottom, effectiveScreenHeight]);

    // True when sheet is at its highest snap point (or has only one snap point)
    const isExpanded =
      parsedConfig.snapYValues.length <= 1 ||
      currentSnapIndex === parsedConfig.snapYValues.length - 1;

    // ── Reanimated Shared Values ───────────────────────────────────────────────
    const translateY = useSharedValue(effectiveScreenHeight);
    const contextY = useSharedValue(0);
    const activeSnapIndex = useSharedValue(defaultSnapIndex);
    const backdropProgress = useSharedValue(0);
    const isClosing = useSharedValue(false);
    const isOpening = useSharedValue(false);
    const isDragging = useSharedValue(false);
    const isHandleDrag = useSharedValue(false);
    const scrollOffset = useSharedValue(0);

    const sharedSnapYValues = useSharedValue(parsedConfig.snapYValues);
    const sharedClosedY = useSharedValue(closedYPosition);

    useEffect(() => {
      sharedSnapYValues.value = parsedConfig.snapYValues;
      sharedClosedY.value = closedYPosition;
    }, [parsedConfig.snapYValues, closedYPosition, sharedSnapYValues, sharedClosedY]);

    // ── Worklets & Callbacks ───────────────────────────────────────────────────
    const notifyCloseFinished = useCallback(() => {
      setIsVisible(false);
      isClosing.value = false;
      isOpening.value = false;
      isDragging.value = false;
      isHandleDrag.value = false;
      onClose?.();
    }, [onClose, isClosing, isOpening, isDragging, isHandleDrag]);

    const notifySnapChanged = useCallback(
      (index: number) => {
        setCurrentSnapIndex(index);
        onSnapChange?.(index);
      },
      [onSnapChange]
    );

    const animateCloseWorklet = useCallback(
      (velocity = 0) => {
        'worklet';
        isClosing.value = true;
        const offscreenY = sharedClosedY.value;

        translateY.value = withSpring(
          offscreenY,
          {
            damping: CLOSE_SPRING.damping,
            stiffness: CLOSE_SPRING.stiffness,
            mass: CLOSE_SPRING.mass,
            velocity: velocity > 50 ? velocity : 0,
          },
          (finished) => {
            if (finished) {
              runOnJS(notifyCloseFinished)();
            }
          }
        );
        backdropProgress.value = withTiming(0, { duration: 220 });
      },
      [sharedClosedY, translateY, backdropProgress, isClosing, notifyCloseFinished]
    );

    const animateToSnapWorklet = useCallback(
      (index: number, velocity = 0) => {
        'worklet';
        const snaps = sharedSnapYValues.value;
        if (!snaps || index < 0 || index >= snaps.length) return;

        const targetY = snaps[index];
        activeSnapIndex.value = index;

        translateY.value = withSpring(
          targetY,
          {
            damping: SHEET_SPRING.damping,
            stiffness: SHEET_SPRING.stiffness,
            mass: SHEET_SPRING.mass,
            velocity: Math.abs(velocity) > 40 ? velocity : 0,
          },
          (finished) => {
            if (finished) {
              runOnJS(notifySnapChanged)(index);
            }
          }
        );
      },
      [sharedSnapYValues, activeSnapIndex, translateY, notifySnapChanged]
    );

    // ── Gestures ───────────────────────────────────────────────────────────────
    // Handle Pan: Always initiates drag immediately regardless of inner scroll position
    const onHandlePanStart = useCallback(() => {
      'worklet';
      if (isClosing.value || isOpening.value) return;
      isDragging.value = true;
      isHandleDrag.value = true;
      contextY.value = translateY.value;
    }, [contextY, translateY, isClosing, isOpening, isDragging, isHandleDrag]);

    // Body Pan: Allows scrolling inner content when expanded and scrolled down
    const onBodyPanStart = useCallback(() => {
      'worklet';
      if (isClosing.value || isOpening.value) return;

      const snaps = sharedSnapYValues.value;
      const isAtHighest = snaps && activeSnapIndex.value === snaps.length - 1;
      // If sheet is at top and inner ScrollView is scrolled down, let ScrollView handle scroll
      if (isAtHighest && scrollOffset.value > 2) {
        return;
      }

      isDragging.value = true;
      isHandleDrag.value = false;
      contextY.value = translateY.value;
    }, [
      contextY,
      translateY,
      isClosing,
      isOpening,
      isDragging,
      isHandleDrag,
      sharedSnapYValues,
      activeSnapIndex,
      scrollOffset,
    ]);

    const onPanUpdate = useCallback(
      (event: { translationY: number }) => {
        'worklet';
        if (isClosing.value || isOpening.value || !isDragging.value) return;

        const snaps = sharedSnapYValues.value;
        if (!snaps || snaps.length === 0) return;

        const isAtHighest = activeSnapIndex.value === snaps.length - 1;
        // If sheet is at top (expanded) and inner scroll view is scrolled down,
        // let the scroll view handle scrolling back up instead of pulling sheet down
        // (unless dragged directly from the handle)
        if (!isHandleDrag.value && isAtHighest && scrollOffset.value > 2 && event.translationY > 0) {
          return;
        }

        const nextY = contextY.value + event.translationY;
        const lowestSnapY = snaps[0];

        // Apply smooth rubber-band resistance when pulling above highest snap point (nextY < 0)
        if (nextY < 0) {
          translateY.value = nextY * 0.22;
        } else if (!enablePanDownToClose && nextY > lowestSnapY) {
          // If pan-down-to-close is disabled, apply rubber-band below lowest snap point
          const overdrag = nextY - lowestSnapY;
          translateY.value = lowestSnapY + overdrag * 0.22;
        } else {
          translateY.value = nextY;
        }
      },
      [
        contextY,
        isClosing,
        isOpening,
        isDragging,
        isHandleDrag,
        sharedSnapYValues,
        activeSnapIndex,
        scrollOffset,
        enablePanDownToClose,
        translateY,
      ]
    );

    const onPanEnd = useCallback(
      (event: { velocityY: number; translationY: number }) => {
        'worklet';
        if (isClosing.value || isOpening.value || !isDragging.value) return;
        isDragging.value = false;

        const velocityY = event.velocityY;
        const translationY = event.translationY;
        const currentY = translateY.value;
        const snaps = sharedSnapYValues.value;
        if (!snaps || snaps.length === 0) return;

        const isSingleSnap = snaps.length === 1;

        // 1. Close condition (only when enablePanDownToClose is enabled):
        // Must be a deliberate, substantial downward drag OR a fast flick with downward movement.
        // Never dismiss on micro-movements, drift, or taps!
        if (enablePanDownToClose) {
          const isSubstantialDrag = translationY > 110;
          const isDownwardFlick = velocityY > 750 && translationY > 50;

          if (isSubstantialDrag || isDownwardFlick) {
            animateCloseWorklet(velocityY);
            return;
          }
        }

        // 2. Multi-snap sheets: Upward flick to next higher snap point (smaller translateY)
        if (!isSingleSnap && velocityY < -450 && translationY < -25) {
          let targetIndex = activeSnapIndex.value;
          for (let i = snaps.length - 1; i >= 0; i--) {
            if (snaps[i] < currentY - 20) {
              targetIndex = i;
              break;
            }
          }
          animateToSnapWorklet(targetIndex, velocityY);
          return;
        }

        // 3. Multi-snap sheets: Downward flick to next lower snap point (larger translateY)
        if (!isSingleSnap && velocityY > 450 && translationY > 25) {
          let targetIndex = -1;
          for (let i = 0; i < snaps.length; i++) {
            if (snaps[i] > currentY + 20) {
              targetIndex = i;
              break;
            }
          }
          if (targetIndex !== -1) {
            animateToSnapWorklet(targetIndex, velocityY);
            return;
          }
        }

        // 4. Single-snap point sheet: If not closed, always spring back cleanly to the open snap point
        if (isSingleSnap) {
          animateToSnapWorklet(0, velocityY);
          return;
        }

        // 5. Multi-snap point momentum projection:
        const projectedY = currentY + velocityY * 0.12;

        let closestIndex = 0;
        let minDiff = Math.abs(projectedY - snaps[0]);
        for (let i = 1; i < snaps.length; i++) {
          const diff = Math.abs(projectedY - snaps[i]);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }

        animateToSnapWorklet(closestIndex, velocityY);
      },
      [
        isClosing,
        isOpening,
        isDragging,
        translateY,
        sharedSnapYValues,
        enablePanDownToClose,
        animateCloseWorklet,
        activeSnapIndex,
        animateToSnapWorklet,
      ]
    );

    const [isBackdropActive, setIsBackdropActive] = useState(false);
    const isBackdropPressDown = useRef(false);
    const openTimestamp = useRef(0);

    // Primary Handle Pan Gesture: Bidirectional, highly responsive 4px threshold
    const handleGesture = useMemo(() => {
      return Gesture.Pan()
        .activeOffsetY([-4, 4])
        .failOffsetX([-25, 25])
        .onStart(onHandlePanStart)
        .onUpdate(onPanUpdate)
        .onEnd(onPanEnd);
    }, [onHandlePanStart, onPanUpdate, onPanEnd]);

    // Body Pan Gesture:
    // When sheet is NOT at top (collapsed), bidirectional gesture expands or collapses.
    // When sheet IS at top (expanded), require deliberate downward drag (>32px) so inner taps & scrolls are never hijacked!
    const bodyGesture = useMemo(() => {
      const gesture = Gesture.Pan()
        .failOffsetX([-20, 20])
        .onStart(onBodyPanStart)
        .onUpdate(onPanUpdate)
        .onEnd(onPanEnd);

      if (isExpanded) {
        return gesture.activeOffsetY(32);
      } else {
        return gesture.activeOffsetY([-20, 20]);
      }
    }, [isExpanded, onBodyPanStart, onPanUpdate, onPanEnd]);

    // ── Open / Close Lifecycle ────────────────────────────────────────────────
    useEffect(() => {
      if (isVisible) {
        openTimestamp.current = Date.now();
        isBackdropPressDown.current = false;
        isClosing.value = false;
        isOpening.value = true;
        isDragging.value = false;
        scrollOffset.value = 0;

        const snaps = parsedConfig.snapYValues;
        const initialIndex =
          defaultSnapIndex >= 0 && defaultSnapIndex < snaps.length
            ? defaultSnapIndex
            : 0;

        activeSnapIndex.value = initialIndex;
        setCurrentSnapIndex(initialIndex);
        const targetY = snaps[initialIndex] ?? 0;

        translateY.value = closedYPosition;
        backdropProgress.value = 0;
        setIsBackdropActive(false);

        const frameId = requestAnimationFrame(() => {
          translateY.value = withSpring(
            targetY,
            SHEET_SPRING,
            (finished) => {
              if (finished) {
                isOpening.value = false;
              }
            }
          );
          backdropProgress.value = withTiming(1, { duration: 250 });
        });

        const timer = setTimeout(() => {
          setIsBackdropActive(true);
        }, 400);

        return () => {
          cancelAnimationFrame(frameId);
          clearTimeout(timer);
        };
      } else {
        setIsBackdropActive(false);
        isBackdropPressDown.current = false;
      }
    }, [isVisible]);

    const handleOpen = useCallback(() => {
      if (isVisible) {
        const snaps = parsedConfig.snapYValues;
        const initialIndex =
          defaultSnapIndex >= 0 && defaultSnapIndex < snaps.length
            ? defaultSnapIndex
            : 0;
        const targetY = snaps[initialIndex] ?? 0;
        translateY.value = withSpring(targetY, SHEET_SPRING, (finished) => {
          if (finished) {
            isOpening.value = false;
          }
        });
        backdropProgress.value = withTiming(1, { duration: 250 });
      } else {
        setIsVisible(true);
      }
    }, [
      isVisible,
      parsedConfig.snapYValues,
      defaultSnapIndex,
      translateY,
      backdropProgress,
      isOpening,
    ]);

    const handleClose = useCallback(() => {
      if (!isVisible || isClosing.value) return;
      setIsBackdropActive(false);
      animateCloseWorklet();
    }, [isVisible, isClosing, animateCloseWorklet]);

    // Controlled visibility effect
    const prevVisibleRef = useRef<boolean | undefined>(visible);
    useEffect(() => {
      if (visible !== undefined) {
        if (visible && !prevVisibleRef.current) {
          handleOpen();
        } else if (!visible && prevVisibleRef.current) {
          handleClose();
        }
        prevVisibleRef.current = visible;
      }
    }, [visible, handleOpen, handleClose]);

    const handleBackdropPress = useCallback(() => {
      if (
        !closeOnBackdropPress ||
        !isBackdropActive ||
        isOpening.value ||
        isClosing.value ||
        Date.now() - openTimestamp.current < 450
      ) {
        return;
      }
      handleClose();
    }, [closeOnBackdropPress, isBackdropActive, isOpening, isClosing, handleClose]);

    const handleSnapTo = useCallback(
      (index: number) => {
        animateToSnapWorklet(index);
      },
      [animateToSnapWorklet]
    );

    const handleExpand = useCallback(() => {
      const highestIndex = parsedConfig.snapYValues.length - 1;
      animateToSnapWorklet(highestIndex);
    }, [parsedConfig.snapYValues.length, animateToSnapWorklet]);

    const handleCollapse = useCallback(() => {
      animateToSnapWorklet(0);
    }, [animateToSnapWorklet]);

    useImperativeHandle(
      ref,
      () => ({
        open: handleOpen,
        close: handleClose,
        snapTo: handleSnapTo,
        expand: handleExpand,
        collapse: handleCollapse,
      }),
      [handleOpen, handleClose, handleSnapTo, handleExpand, handleCollapse]
    );

    // Dynamic layout measurement for auto-height sheets
    const handleContentLayout = useCallback(
      (event: LayoutChangeEvent) => {
        if (!parsedConfig.isAuto) return;
        const height = Math.round(event.nativeEvent.layout.height);
        if (height > 0 && Math.abs(height - measuredContentHeight) > 4) {
          setMeasuredContentHeight(height);
        }
      },
      [parsedConfig.isAuto, measuredContentHeight]
    );

    // ── Animated Styles ────────────────────────────────────────────────────────
    const sheetAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: translateY.value }],
      };
    });

    const backdropAnimatedStyle = useAnimatedStyle(() => {
      const highestSnapY =
        sharedSnapYValues.value[sharedSnapYValues.value.length - 1] ?? 0;
      const closedY = Math.max(sharedClosedY.value, highestSnapY + 1);
      // Proportional fade as the sheet drags down to offscreen
      const dragFade = interpolate(
        translateY.value,
        [highestSnapY, closedY],
        [1, 0],
        Extrapolation.CLAMP
      );
      return {
        opacity: backdropProgress.value * dragFade * backdropOpacity,
      };
    });

    return (
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none" // Controlled via Reanimated 120fps spring physics
        onRequestClose={handleClose}
        statusBarTranslucent={true}
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            {/* Animated Backdrop with Proportional Drag-Fade */}
            <AnimatedPressable
              style={[styles.backdrop, backdropAnimatedStyle]}
              disabled={!isBackdropActive}
              onPressIn={() => {
                isBackdropPressDown.current = true;
              }}
              onPress={() => {
                if (!isBackdropPressDown.current) return;
                isBackdropPressDown.current = false;
                handleBackdropPress();
              }}
              onPressOut={() => {
                isBackdropPressDown.current = false;
              }}
              pointerEvents={isBackdropActive ? 'auto' : 'none'}
              accessibilityRole="none"
              accessibilityLabel="Dismiss bottom sheet"
            />

            {/* Bottom Sheet Animated Surface */}
            <Animated.View
              style={[
                styles.sheetContainer,
                {
                  maxHeight: maxAllowedHeight,
                  ...(parsedConfig.maxContainerHeight > 0 && !parsedConfig.isAuto
                    ? { height: parsedConfig.maxContainerHeight }
                    : {}),
                },
                sheetAnimatedStyle,
                style,
              ]}
            >
              {/* Dedicated Drag Handle Zone */}
              <GestureDetector gesture={handleGesture}>
                <View collapsable={false} style={[styles.handleArea, handleStyle]}>
                  <BottomSheetHandle />
                </View>
              </GestureDetector>

              {/* Sheet Content Area */}
              <GestureDetector gesture={bodyGesture}>
                <View
                  collapsable={false}
                  onLayout={handleContentLayout}
                  style={[
                    parsedConfig.isAuto
                      ? styles.autoContentContainer
                      : styles.contentContainer,
                    contentPadding && styles.withPadding,
                    {
                      paddingBottom:
                        (insets.bottom > 0 ? insets.bottom + 16 : 24) +
                        (parsedConfig.isAuto
                          ? 0
                          : Math.max(
                              0,
                              (parsedConfig.maxContainerHeight || 0) -
                                (parsedConfig.heights[currentSnapIndex] ??
                                  parsedConfig.maxContainerHeight ??
                                  0)
                            )),
                    },
                  ]}
                >
                  <BottomSheetContext.Provider value={{ scrollOffset, isExpanded }}>
                    {children}
                  </BottomSheetContext.Provider>
                </View>
              </GestureDetector>
            </Animated.View>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </Modal>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  handleArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
  },
  autoContentContainer: {
    flexShrink: 1,
  },
  withPadding: {
    paddingHorizontal: 16,
  },
});
