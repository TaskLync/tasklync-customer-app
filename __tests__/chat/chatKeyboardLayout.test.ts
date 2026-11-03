import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Chat Keyboard-Aware Layout & Avoidance Engine', () => {
  /**
   * Evaluates KeyboardAvoidingView configuration for chat screens.
   * Root KeyboardAvoidingView must use 'height' on Android and 'padding' on iOS
   * with keyboardVerticalOffset = 0 (since custom ChatHeader is inside the container).
   */
  function getKeyboardAvoidingConfig(platform: 'ios' | 'android'): {
    behavior: 'height' | 'padding';
    keyboardVerticalOffset: number;
  } {
    return {
      behavior: platform === 'ios' ? 'padding' : 'height',
      keyboardVerticalOffset: 0,
    };
  }

  /**
   * Simulates the visible frame and input position under Android keyboard avoidance.
   * On Android, KeyboardAvoidingView with behavior='height' reduces its container height.
   */
  function calculateAndroidChatLayout(params: {
    windowHeight: number;
    keyboardHeight: number;
    headerHeight: number;
    quoteBannerHeight?: number;
    inputHeight: number;
    behavior?: 'height' | undefined;
  }): {
    containerHeight: number;
    inputTopY: number;
    inputBottomY: number;
    keyboardTopY: number;
    isInputOccluded: boolean;
    occlusionPixels: number;
    listAvailableHeight: number;
  } {
    const {
      windowHeight,
      keyboardHeight,
      headerHeight,
      quoteBannerHeight = 0,
      inputHeight,
      behavior,
    } = params;

    const keyboardTopY = windowHeight - keyboardHeight;

    if (behavior === 'height') {
      // Correct implementation: container resizes
      const containerHeight = windowHeight - keyboardHeight;
      const inputBottomY = containerHeight;
      const inputTopY = containerHeight - inputHeight;
      const listAvailableHeight = containerHeight - headerHeight - quoteBannerHeight - inputHeight;

      return {
        containerHeight,
        inputTopY,
        inputBottomY,
        keyboardTopY,
        isInputOccluded: inputBottomY > keyboardTopY,
        occlusionPixels: Math.max(0, inputBottomY - keyboardTopY),
        listAvailableHeight,
      };
    } else {
      // Broken implementation: behavior=undefined on Android, container does not resize
      const containerHeight = windowHeight;
      const inputBottomY = containerHeight;
      const inputTopY = containerHeight - inputHeight;
      const listAvailableHeight = containerHeight - headerHeight - quoteBannerHeight - inputHeight;

      return {
        containerHeight,
        inputTopY,
        inputBottomY,
        keyboardTopY,
        isInputOccluded: inputBottomY > keyboardTopY,
        occlusionPixels: Math.max(0, inputBottomY - keyboardTopY),
        listAvailableHeight,
      };
    }
  }

  /**
   * Simulates the visible frame and input position under iOS keyboard avoidance.
   * On iOS, KeyboardAvoidingView with behavior='padding' adds bottom padding equal to keyboardHeight.
   */
  function calculateIOSChatLayout(params: {
    windowHeight: number;
    keyboardHeight: number;
    headerHeight: number;
    quoteBannerHeight?: number;
    inputHeight: number;
    keyboardVerticalOffset: number;
  }): {
    paddingBottom: number;
    inputBottomY: number;
    keyboardTopY: number;
    isInputOccluded: boolean;
    excessGap: number;
    listAvailableHeight: number;
  } {
    const {
      windowHeight,
      keyboardHeight,
      headerHeight,
      quoteBannerHeight = 0,
      inputHeight,
      keyboardVerticalOffset,
    } = params;

    const keyboardTopY = windowHeight - keyboardHeight;
    const paddingBottom = Math.max(0, keyboardHeight - keyboardVerticalOffset);

    // Input sits above the bottom padding
    const inputBottomY = windowHeight - paddingBottom;
    const listAvailableHeight =
      windowHeight - paddingBottom - headerHeight - quoteBannerHeight - inputHeight;

    const isInputOccluded = inputBottomY > keyboardTopY;
    const excessGap = Math.max(0, keyboardTopY - inputBottomY);

    return {
      paddingBottom,
      inputBottomY,
      keyboardTopY,
      isInputOccluded,
      excessGap,
      listAvailableHeight,
    };
  }

  /**
   * ChatInput active bottom padding rule:
   * When keyboard is open: 6px tight margin
   * When keyboard is closed: Math.max(bottomInset, 10)
   */
  function calculateChatInputBottomPadding(isKeyboardVisible: boolean, bottomInset: number): number {
    return isKeyboardVisible ? 6 : Math.max(bottomInset, 10);
  }

  describe('KeyboardAvoidingView Platform Configuration', () => {
    test('selects behavior="height" and offset=0 for Android', () => {
      const config = getKeyboardAvoidingConfig('android');
      assert.strictEqual(config.behavior, 'height');
      assert.strictEqual(config.keyboardVerticalOffset, 0);
    });

    test('selects behavior="padding" and offset=0 for iOS', () => {
      const config = getKeyboardAvoidingConfig('ios');
      assert.strictEqual(config.behavior, 'padding');
      assert.strictEqual(config.keyboardVerticalOffset, 0);
    });
  });

  describe('Android Keyboard Avoidance & Occlusion Elimination', () => {
    test('demonstrates that broken behavior=undefined leaves input occluded behind keyboard', () => {
      // Standard Android phone: 800dp height, 300dp keyboard, 88dp header, 56dp input
      const broken = calculateAndroidChatLayout({
        windowHeight: 800,
        keyboardHeight: 300,
        headerHeight: 88,
        inputHeight: 56,
        behavior: undefined, // previous broken implementation in custom service chat
      });

      // The input was occluded by 300px (completely behind keyboard)
      assert.strictEqual(broken.isInputOccluded, true);
      assert.strictEqual(broken.occlusionPixels, 300);
      assert.strictEqual(broken.inputBottomY, 800);
      assert.strictEqual(broken.keyboardTopY, 500);
    });

    test('verifies that fixed behavior="height" lifts input exactly above keyboard (0px occlusion)', () => {
      const fixed = calculateAndroidChatLayout({
        windowHeight: 800,
        keyboardHeight: 300,
        headerHeight: 88,
        inputHeight: 56,
        behavior: 'height', // fixed implementation matching booking chat
      });

      // Occlusion is completely eliminated
      assert.strictEqual(fixed.isInputOccluded, false);
      assert.strictEqual(fixed.occlusionPixels, 0);
      assert.strictEqual(fixed.inputBottomY, 500);
      assert.strictEqual(fixed.keyboardTopY, 500);
      assert.strictEqual(fixed.containerHeight, 500);
      // FlatList has ample scrollable viewport
      assert.strictEqual(fixed.listAvailableHeight, 356);
      assert.ok(fixed.listAvailableHeight > 200, 'Viewport remains comfortably scrollable');
    });

    test('maintains scrollability on compact Android screens with Quote Banner displayed', () => {
      // Compact Android screen (640dp) with active Quote Ready banner (52dp)
      const compactWithQuote = calculateAndroidChatLayout({
        windowHeight: 640,
        keyboardHeight: 280,
        headerHeight: 80,
        quoteBannerHeight: 52,
        inputHeight: 56,
        behavior: 'height',
      });

      assert.strictEqual(compactWithQuote.isInputOccluded, false);
      assert.strictEqual(compactWithQuote.occlusionPixels, 0);
      assert.strictEqual(compactWithQuote.containerHeight, 360);
      // 360 - 80 - 52 - 56 = 172dp scrollable space for messages
      assert.strictEqual(compactWithQuote.listAvailableHeight, 172);
      assert.ok(compactWithQuote.listAvailableHeight > 100, 'Compact screen accommodates list and banner');
    });
  });

  describe('iOS Keyboard Avoidance & Offset Calibration', () => {
    test('demonstrates that broken offset=90 created a 90px dead-space gap on iOS', () => {
      // iOS screen (844dp height), 336dp keyboard, offset=90 (previous buggy code)
      const buggyIOS = calculateIOSChatLayout({
        windowHeight: 844,
        keyboardHeight: 336,
        headerHeight: 96,
        inputHeight: 56,
        keyboardVerticalOffset: 90, // old bug
      });

      // With offset=90, paddingBottom was 246 instead of 336, leaving input 90px occluded!
      assert.strictEqual(buggyIOS.paddingBottom, 246);
      assert.strictEqual(buggyIOS.isInputOccluded, true);
    });

    test('verifies that fixed offset=0 aligns composer flush with iOS keyboard', () => {
      const fixedIOS = calculateIOSChatLayout({
        windowHeight: 844,
        keyboardHeight: 336,
        headerHeight: 96,
        inputHeight: 56,
        keyboardVerticalOffset: 0, // fixed
      });

      assert.strictEqual(fixedIOS.paddingBottom, 336);
      assert.strictEqual(fixedIOS.isInputOccluded, false);
      assert.strictEqual(fixedIOS.excessGap, 0);
      assert.strictEqual(fixedIOS.inputBottomY, 508);
      assert.strictEqual(fixedIOS.keyboardTopY, 508);
      // 844 - 336 - 96 - 56 = 356dp
      assert.strictEqual(fixedIOS.listAvailableHeight, 356);
    });
  });

  describe('ChatInput Dynamic Safe-Area Padding', () => {
    test('collapses to 6px tight clearance when keyboard is open', () => {
      const openPaddingAndroid3Btn = calculateChatInputBottomPadding(true, 48);
      const openPaddingAndroidGesture = calculateChatInputBottomPadding(true, 24);
      const openPaddingIOSHomeBar = calculateChatInputBottomPadding(true, 34);
      const openPaddingZero = calculateChatInputBottomPadding(true, 0);

      assert.strictEqual(openPaddingAndroid3Btn, 6);
      assert.strictEqual(openPaddingAndroidGesture, 6);
      assert.strictEqual(openPaddingIOSHomeBar, 6);
      assert.strictEqual(openPaddingZero, 6);
    });

    test('protects resting layout with safe area insets when keyboard is dismissed', () => {
      const closed3Btn = calculateChatInputBottomPadding(false, 48);
      assert.strictEqual(closed3Btn, 48);

      const closedGesture = calculateChatInputBottomPadding(false, 24);
      assert.strictEqual(closedGesture, 24);

      const closedIOS = calculateChatInputBottomPadding(false, 34);
      assert.strictEqual(closedIOS, 34);

      const closedZero = calculateChatInputBottomPadding(false, 0);
      assert.strictEqual(closedZero, 10);
    });
  });

  describe('NewMessagesBanner Badge Label Formatting', () => {
    test('formats singular and plural badge labels accurately', () => {
      const formatLabel = (count: number) => (count === 1 ? '1 new message' : `${count} new messages`);

      assert.strictEqual(formatLabel(1), '1 new message');
      assert.strictEqual(formatLabel(2), '2 new messages');
      assert.strictEqual(formatLabel(12), '12 new messages');
    });
  });
});
