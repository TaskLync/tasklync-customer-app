import { forwardRef } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useBottomSheetContext } from './BottomSheet';

export interface BottomSheetScrollViewProps extends ScrollViewProps {}

/**
 * ScrollView optimized for use inside BottomSheet components.
 * Automatically synchronizes scroll offset with parent BottomSheet to coordinate
 * gesture dragging vs. inner scrolling without conflicts.
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
      scrollEnabled,
      ...props
    },
    ref
  ) => {
    const bottomSheet = useBottomSheetContext();

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
        ref={ref}
        bounces={bounces}
        overScrollMode={overScrollMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        scrollEventThrottle={scrollEventThrottle}
        nestedScrollEnabled={nestedScrollEnabled}
        onScroll={handleScroll}
        scrollEnabled={resolvedScrollEnabled}
        {...props}
      />
    );
  }
);

BottomSheetScrollView.displayName = 'BottomSheetScrollView';
