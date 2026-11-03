import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Name Screen Keyboard-Aware Layout & Validation Engine', () => {
  /**
   * Helper that reproduces the active bottom padding calculation:
   * 12px ergonomic clearance when keyboard is open;
   * safe area inset + 8px (or 16px fallback) when keyboard is closed.
   */
  function calculateNameBottomPadding(params: {
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
    buttonContainerHeight?: number;
  }): number {
    const {
      windowHeight,
      keyboardHeight,
      topInset,
      buttonContainerHeight = 72, // 12 + 48 + 12
    } = params;

    return windowHeight - topInset - buttonContainerHeight - keyboardHeight;
  }

  describe('Active Bottom Padding Calculation', () => {
    test('provides exact 12px ergonomic clearance above soft keyboard when open', () => {
      const openGesture = calculateNameBottomPadding({ isKeyboardVisible: true, bottomInset: 24 });
      const openThreeButton = calculateNameBottomPadding({ isKeyboardVisible: true, bottomInset: 48 });
      const openZero = calculateNameBottomPadding({ isKeyboardVisible: true, bottomInset: 0 });
      const openIOS = calculateNameBottomPadding({ isKeyboardVisible: true, bottomInset: 34 });

      assert.strictEqual(openGesture, 12);
      assert.strictEqual(openThreeButton, 12);
      assert.strictEqual(openZero, 12);
      assert.strictEqual(openIOS, 12);
    });

    test('protects resting layout with safe area insets when keyboard is closed', () => {
      // Android 3-button nav (48dp)
      const closedThreeButton = calculateNameBottomPadding({ isKeyboardVisible: false, bottomInset: 48 });
      assert.strictEqual(closedThreeButton, 56); // 48 + 8

      // Android gesture navigation bar (24dp)
      const closedGesture = calculateNameBottomPadding({ isKeyboardVisible: false, bottomInset: 24 });
      assert.strictEqual(closedGesture, 32); // 24 + 8

      // iOS modern home indicator (34dp)
      const closedIOS = calculateNameBottomPadding({ isKeyboardVisible: false, bottomInset: 34 });
      assert.strictEqual(closedIOS, 42); // 34 + 8

      // Fallback for devices with 0 bottom inset
      const closedZero = calculateNameBottomPadding({ isKeyboardVisible: false, bottomInset: 0 });
      assert.strictEqual(closedZero, 16);
    });
  });

  describe('KeyboardAvoidingView Displacement & Elevation', () => {
    test('lifts "Let\'s go" button cleanly above Android keyboard on translucent screen', () => {
      // Screen height = 800, keyboard height = 290
      const displacement = calculateDisplacement({
        frameY: 0,
        frameHeight: 800,
        keyboardScreenY: 510,
        keyboardVerticalOffset: 0,
      });

      assert.strictEqual(displacement, 290);
    });

    test('prevents double-adjustment if native Android window decor resized natively', () => {
      const displacement = calculateDisplacement({
        frameY: 0,
        frameHeight: 510,
        keyboardScreenY: 510,
        keyboardVerticalOffset: 0,
      });

      assert.strictEqual(displacement, 0);
    });
  });

  describe('Viewport Accommodation on Compact Screens', () => {
    test('guarantees sufficient viewport height on compact Android screens (640dp)', () => {
      const availableHeight = calculateAvailableViewportHeight({
        windowHeight: 640,
        keyboardHeight: 280,
        topInset: 24,
      });

      // 640 - 24 - 72 - 280 = 264px
      assert.strictEqual(availableHeight, 264);
      assert.ok(availableHeight > 200, 'Viewport easily accommodates emoji, heading, and input without collision');
    });
  });

  describe('Name Input Validation Rules', () => {
    test('gates CTA button on trimmed name length >= 2', () => {
      const validate = (name: string) => name.trim().length >= 2;

      assert.strictEqual(validate(''), false);
      assert.strictEqual(validate(' '), false);
      assert.strictEqual(validate('A'), false);
      assert.strictEqual(validate(' A '), false);
      assert.strictEqual(validate('Al'), true);
      assert.strictEqual(validate('Uzair Sarwar'), true);
    });

    test('calculates character count display thresholds accurately', () => {
      const checkThresholds = (name: string) => {
        const trimmed = name.trim();
        return {
          showCount: trimmed.length > 30,
          isWarning: trimmed.length >= 45,
          length: trimmed.length,
        };
      };

      const shortName = checkThresholds('Ali Ahmed');
      assert.strictEqual(shortName.showCount, false);
      assert.strictEqual(shortName.isWarning, false);

      const longName = checkThresholds('Muhammad Abdullah Tariq Chaudhary');
      assert.strictEqual(longName.showCount, true);
      assert.strictEqual(longName.isWarning, false);

      const nearLimitName = checkThresholds('Syed Muhammad Abdullah Tariq Chaudhary Al-Hussaini');
      assert.strictEqual(nearLimitName.showCount, true);
      assert.strictEqual(nearLimitName.isWarning, true);
    });
  });
});
