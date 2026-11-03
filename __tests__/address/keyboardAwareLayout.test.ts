import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Address Confirm Sheet Keyboard-Aware Layout Engine', () => {
  /**
   * Helper that reproduces the dynamic height constraint algorithm
   * used in AddressConfirmSheet to prevent collision with top search overlay.
   */
  function calculateMaxAllowedHeight(params: {
    isKeyboardVisible: boolean;
    windowHeight: number;
    keyboardHeight: number;
    topInset: number;
    topBarSpacing?: number;
    platform: 'ios' | 'android';
  }): number {
    const {
      isKeyboardVisible,
      windowHeight,
      keyboardHeight,
      topInset,
      topBarSpacing = 68,
      platform,
    } = params;

    if (!isKeyboardVisible) {
      return platform === 'ios' ? 480 : 440;
    }

    const availableVerticalSpace = windowHeight - keyboardHeight - (topInset + topBarSpacing);
    return Math.max(220, availableVerticalSpace);
  }

  /**
   * Helper that reproduces the active bottom padding calculation:
   * 12px ergonomic clearance when keyboard is open,
   * safe area inset + 14px baseline when keyboard is closed.
   */
  function calculateActiveBottomPadding(params: {
    isKeyboardVisible: boolean;
    bottomInset: number;
  }): number {
    const { isKeyboardVisible, bottomInset } = params;
    const closedPadding = bottomInset > 0 ? bottomInset + 14 : 20;
    return isKeyboardVisible ? 12 : closedPadding;
  }

  /**
   * Helper that calculates KeyboardAvoidingView displacement:
   * displacement = Math.max(frame.y + frame.height - keyboardY, 0)
   */
  function calculateDisplacement(params: {
    frameY: number;
    frameHeight: number;
    keyboardScreenY: number;
    keyboardVerticalOffset: number;
  }): number {
    const { frameY, frameHeight, keyboardScreenY, keyboardVerticalOffset } = params;
    const keyboardY = keyboardScreenY - keyboardVerticalOffset;
    return Math.max(frameY + frameHeight - keyboardY, 0);
  }

  test('calculates correct displacement when Android keyboard opens on translucent screen', () => {
    // Translucent map screen: screenHeight = 800, keyboardHeight = 300
    // Sheet sits at bottom: frame.y = 800 - 360 = 440, frame.height = 360
    // Top of keyboard is at screenY = 500
    const displacement = calculateDisplacement({
      frameY: 440,
      frameHeight: 360,
      keyboardScreenY: 500,
      keyboardVerticalOffset: 0, // 0 on Android
    });

    // Displacement must exactly equal the keyboard height (300px)
    assert.strictEqual(displacement, 300);
  });

  test('returns 0 displacement if Android window decor resizes natively', () => {
    // If native window was already resized from 800 to 500:
    // Sheet sits at bottom of resized window: frame.y = 500 - 360 = 140, frame.height = 360
    // keyboardScreenY is 500
    const displacement = calculateDisplacement({
      frameY: 140,
      frameHeight: 360,
      keyboardScreenY: 500,
      keyboardVerticalOffset: 0,
    });

    // In a resized window, displacement is 0, avoiding double-adjustment
    assert.strictEqual(displacement, 0);
  });

  test('dynamically clamps sheet maxHeight to prevent collision with top search overlay', () => {
    // Standard Android screen: windowHeight = 800, keyboardHeight = 300, topInset = 32
    const heightStandard = calculateMaxAllowedHeight({
      isKeyboardVisible: true,
      windowHeight: 800,
      keyboardHeight: 300,
      topInset: 32,
      platform: 'android',
    });

    // 800 - 300 - (32 + 68) = 400px.
    assert.strictEqual(heightStandard, 400);

    // Compact screen: windowHeight = 680, keyboardHeight = 280, topInset = 24
    const heightCompact = calculateMaxAllowedHeight({
      isKeyboardVisible: true,
      windowHeight: 680,
      keyboardHeight: 280,
      topInset: 24,
      platform: 'android',
    });

    // 680 - 280 - (24 + 68) = 308px.
    assert.strictEqual(heightCompact, 308);

    // Extremely constrained screen: ensures minimum ergonomic floor of 220px
    const heightUltraSmall = calculateMaxAllowedHeight({
      isKeyboardVisible: true,
      windowHeight: 500,
      keyboardHeight: 300,
      topInset: 24,
      platform: 'android',
    });

    assert.strictEqual(heightUltraSmall, 220);
  });

  test('restores default sheet height when keyboard dismisses', () => {
    const heightAndroidClosed = calculateMaxAllowedHeight({
      isKeyboardVisible: false,
      windowHeight: 800,
      keyboardHeight: 0,
      topInset: 32,
      platform: 'android',
    });
    assert.strictEqual(heightAndroidClosed, 440);

    const heightIOSClosed = calculateMaxAllowedHeight({
      isKeyboardVisible: false,
      windowHeight: 844,
      keyboardHeight: 0,
      topInset: 47,
      platform: 'ios',
    });
    assert.strictEqual(heightIOSClosed, 480);
  });

  test('switches active bottom padding cleanly for Android navigation bars', () => {
    // Android gesture navigation bar: bottomInset = 24
    const closedGesture = calculateActiveBottomPadding({
      isKeyboardVisible: false,
      bottomInset: 24,
    });
    assert.strictEqual(closedGesture, 38); // 24 + 14

    // Android 3-button navigation bar: bottomInset = 48
    const closed3Button = calculateActiveBottomPadding({
      isKeyboardVisible: false,
      bottomInset: 48,
    });
    assert.strictEqual(closed3Button, 62); // 48 + 14

    // Keyboard opened on Android: system navigation bar is occluded, exactly 12px breathing room
    const openedPadding = calculateActiveBottomPadding({
      isKeyboardVisible: true,
      bottomInset: 48,
    });
    assert.strictEqual(openedPadding, 12);
  });
});
