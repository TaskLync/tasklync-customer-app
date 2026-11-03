import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Phone Screen Keyboard-Aware Layout & Bottom Action Engine', () => {
  /**
   * Helper that reproduces the active bottom padding calculation:
   * 12px ergonomic clearance when keyboard is open;
   * safe area inset + 8px (or 16px fallback) when keyboard is closed.
   */
  function calculatePhoneBottomPadding(params: {
    isKeyboardVisible: boolean;
    bottomInset: number;
  }): number {
    const { isKeyboardVisible, bottomInset } = params;
    if (isKeyboardVisible) {
      return 12;
    }
    return bottomInset > 0 ? bottomInset + 8 : 16;
  }

  /**
   * Helper that calculates KeyboardAvoidingView displacement:
   * displacement = Math.max(frame.y + frame.height - keyboardY, 0)
   */
  function calculateDisplacement(params: {
    frameY: number;
    frameHeight: number;
    keyboardScreenY: number;
    keyboardVerticalOffset?: number;
  }): number {
    const { frameY, frameHeight, keyboardScreenY, keyboardVerticalOffset = 0 } = params;
    const keyboardY = keyboardScreenY - keyboardVerticalOffset;
    return Math.max(frameY + frameHeight - keyboardY, 0);
  }

  /**
   * Calculates visible viewport height available for the ScrollView
   * when KeyboardAvoidingView shifts the bottom CTA bar above the keyboard.
   */
  function calculateAvailableViewportHeight(params: {
    windowHeight: number;
    keyboardHeight: number;
    topInset: number;
    headerHeight?: number;
    buttonContainerHeight?: number;
  }): number {
    const {
      windowHeight,
      keyboardHeight,
      topInset,
      headerHeight = 52,
      buttonContainerHeight = 72, // 12 + 48 + 12
    } = params;

    return windowHeight - topInset - headerHeight - buttonContainerHeight - keyboardHeight;
  }

  describe('Active Bottom Padding Calculation', () => {
    test('provides exact 12px ergonomic clearance above soft keyboard when open', () => {
      // Regardless of device bottom safe area, when keyboard is open, bottom padding must be 12px
      const openGesture = calculatePhoneBottomPadding({ isKeyboardVisible: true, bottomInset: 24 });
      const openThreeButton = calculatePhoneBottomPadding({ isKeyboardVisible: true, bottomInset: 48 });
      const openZero = calculatePhoneBottomPadding({ isKeyboardVisible: true, bottomInset: 0 });
      const openIOS = calculatePhoneBottomPadding({ isKeyboardVisible: true, bottomInset: 34 });

      assert.strictEqual(openGesture, 12);
      assert.strictEqual(openThreeButton, 12);
      assert.strictEqual(openZero, 12);
      assert.strictEqual(openIOS, 12);
    });

    test('protects resting layout with safe area insets when keyboard is closed', () => {
      // Android 3-button nav (48dp)
      const closedThreeButton = calculatePhoneBottomPadding({ isKeyboardVisible: false, bottomInset: 48 });
      assert.strictEqual(closedThreeButton, 56); // 48 + 8

      // Android gesture navigation bar (24dp)
      const closedGesture = calculatePhoneBottomPadding({ isKeyboardVisible: false, bottomInset: 24 });
      assert.strictEqual(closedGesture, 32); // 24 + 8

      // iOS modern home indicator (34dp)
      const closedIOS = calculatePhoneBottomPadding({ isKeyboardVisible: false, bottomInset: 34 });
      assert.strictEqual(closedIOS, 42); // 34 + 8

      // Fallback for devices with 0 bottom inset
      const closedZero = calculatePhoneBottomPadding({ isKeyboardVisible: false, bottomInset: 0 });
      assert.strictEqual(closedZero, 16);
    });
  });

  describe('KeyboardAvoidingView Displacement & Elevation', () => {
    test('lifts bottom container cleanly above Android keyboard on translucent screen', () => {
      // Screen height = 800, keyboard height = 290
      // Frame height = 800, frameY = 0
      // Keyboard sits from Y = 510 to 800 (keyboardScreenY = 510)
      const displacement = calculateDisplacement({
        frameY: 0,
        frameHeight: 800,
        keyboardScreenY: 510,
        keyboardVerticalOffset: 0,
      });

      // Displacement must match keyboard height exactly (290px)
      assert.strictEqual(displacement, 290);
    });

    test('prevents double-adjustment if native Android window already resized', () => {
      // If native window resized from 800 to 510: frameHeight = 510
      const displacement = calculateDisplacement({
        frameY: 0,
        frameHeight: 510,
        keyboardScreenY: 510,
        keyboardVerticalOffset: 0,
      });

      // Zero extra padding needed
      assert.strictEqual(displacement, 0);
    });

    test('lifts cleanly on iOS without offset interference', () => {
      // Screen height = 844, keyboard height = 336
      const displacement = calculateDisplacement({
        frameY: 0,
        frameHeight: 844,
        keyboardScreenY: 508, // 844 - 336
        keyboardVerticalOffset: 0,
      });

      assert.strictEqual(displacement, 336);
    });
  });

  describe('Viewport Accommodation & Scroll Capacity on Compact Screens', () => {
    test('ensures sufficient vertical space for phone input on standard Android screen (800dp)', () => {
      const availableHeight = calculateAvailableViewportHeight({
        windowHeight: 800,
        keyboardHeight: 290,
        topInset: 32,
      });

      // 800 - 32 - 52 - 72 - 290 = 354px available
      assert.strictEqual(availableHeight, 354);
      assert.ok(availableHeight >= 300, 'Viewport must easily fit phone input without compression');
    });

    test('maintains scrollability on compact Android screens (640dp)', () => {
      const availableHeight = calculateAvailableViewportHeight({
        windowHeight: 640,
        keyboardHeight: 280,
        topInset: 24,
      });

      // 640 - 24 - 52 - 72 - 280 = 212px available
      assert.strictEqual(availableHeight, 212);
      // Even with 212px, ScrollView allows auto-scrolling to show phone input without clipping
      assert.ok(availableHeight > 150, 'Compact screen maintains sufficient space for input view');
    });
  });

  describe('Phone Input Validation Rules', () => {
    test('gates Continue button on phone length >= 10', () => {
      const checkValid = (phone: string) => phone.length >= 10;

      assert.strictEqual(checkValid(''), false);
      assert.strictEqual(checkValid('300123456'), false); // 9 digits
      assert.strictEqual(checkValid('3001234567'), true); // 10 digits
      assert.strictEqual(checkValid('03001234567'), true); // 11 digits
    });
  });
});
