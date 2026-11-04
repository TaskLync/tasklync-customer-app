import { forwardRef, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  TextInput,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useBottomSheetContext } from './BottomSheet';

export interface BottomSheetScrollViewProps extends ScrollViewProps {}

// Breathing room kept between the focused input and the edge of the visible area.
const FOCUS_MARGIN = 24;

/**
 * ScrollView optimized for use inside BottomSheet components.
 * - Synchronizes scroll offset with the parent BottomSheet to coordinate gesture dragging vs.
 *   inner scrolling without conflicts.
 * - While the keyboard is open, scrolls the focused TextInput into the visible area (minimal
 *   scroll, only when it would otherwise be hidden). The viewport shrinks when the sheet resizes
 *   above the keyboard, so the onLayout of this view is the exact moment to re-check.
 */
export const BottomSheetScrollView = forwardRef<ScrollView, BottomSheetScrollViewProps>(
  (
    {
      bounces = false,
      overScrollMode = 'never',
      showsVerticalScrollIndicator = false,
      scrollEventThrottle = 16,
      nestedScrollEnabled = true,
      onScroll,
      onLayout,
      scrollEnabled,
      ...props
    },
    ref
  ) => {
    const bottomSheet = useBottomSheetContext();
    const innerRef = useRef<ScrollView | null>(null);
    const viewportHeight = useRef(0);
    const isKeyboardOpen = bottomSheet?.isKeyboardOpen ?? false;

    const setRefs = useCallback(
      (node: ScrollView | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as { current: ScrollView | null }).current = node;
      },
      [ref]
    );

    const scrollFocusedInputIntoView = useCallback(() => {
      const scroll = innerRef.current;
      const focused = TextInput.State.currentlyFocusedInput?.();
      const content = (scroll as unknown as { getInnerViewRef?: () => unknown } | null)?.getInnerViewRef?.();
      if (!scroll || !focused || !content || viewportHeight.current <= 0) return;

      try {
        (focused as any).measureLayout(
          content as any,
          (_x: number, y: number, _w: number, h: number) => {
            const offset = bottomSheet?.scrollOffset.value ?? 0;
            const visibleBottom = offset + viewportHeight.current;
            if (y + h + FOCUS_MARGIN > visibleBottom) {
              scroll.scrollTo({ y: y + h + FOCUS_MARGIN - viewportHeight.current, animated: true });
            } else if (y - FOCUS_MARGIN < offset) {
              scroll.scrollTo({ y: Math.max(0, y - FOCUS_MARGIN), animated: true });
            }
          },
          () => {}
        );
      } catch {
        // Focused input is not inside this scroll view; nothing to do.
      }
    }, [bottomSheet]);

    // Keyboard just opened (or closed): re-check once the new layout has settled.
    useEffect(() => {
      if (!isKeyboardOpen) return;
      const t = setTimeout(scrollFocusedInputIntoView, 60);
      return () => clearTimeout(t);
    }, [isKeyboardOpen, scrollFocusedInputIntoView]);

    const handleLayout = (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      if (isKeyboardOpen) scrollFocusedInputIntoView();
      onLayout?.(event);
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (bottomSheet) {
        bottomSheet.scrollOffset.value = event.nativeEvent.contentOffset.y;
      }
      onScroll?.(event);
    };

    // Allow smooth inner scrolling at all snap points unless explicitly disabled by caller
    const resolvedScrollEnabled = scrollEnabled !== undefined ? scrollEnabled : true;

    return (
      <ScrollView
        ref={setRefs}
        bounces={bounces}
        overScrollMode={overScrollMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        scrollEventThrottle={scrollEventThrottle}
        nestedScrollEnabled={nestedScrollEnabled}
        onScroll={handleScroll}
        onLayout={handleLayout}
        scrollEnabled={resolvedScrollEnabled}
        {...props}
      />
    );
  }
);

BottomSheetScrollView.displayName = 'BottomSheetScrollView';
