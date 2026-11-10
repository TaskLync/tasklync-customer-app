import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isCartBannerVisible, CART_BANNER_ROUTES } from '../../src/components/cart/cartBannerVisibility.ts';

const visible = (isSignedIn: boolean, segments: string[], itemCount = 2) =>
  isCartBannerVisible({ isSignedIn, segments, itemCount });

describe('cart banner visibility', () => {
  test('signed in, browsing screens, items in cart -> shown', () => {
    assert.strictEqual(visible(true, ['(tabs)']), true);
    assert.strictEqual(visible(true, ['(tabs)', 'explore']), true);
    assert.strictEqual(visible(true, ['service', '[id]']), true);
    assert.strictEqual(visible(true, ['worker', '[id]']), true);
  });

  test('NEVER on Welcome / login / OTP / registration, even with a persisted cart', () => {
    for (const screen of ['welcome', 'phone', 'otp', 'name', 'location-permission', 'index']) {
      assert.strictEqual(visible(true, ['(auth)', screen]), false, screen);
      assert.strictEqual(visible(false, ['(auth)', screen]), false, screen);
    }
  });

  test('not while signed out or before the session is restored, on any route', () => {
    assert.strictEqual(visible(false, ['(tabs)']), false);
    assert.strictEqual(visible(false, []), false);
  });

  test('hidden on the cart and the booking funnel (it would duplicate their own CTA)', () => {
    for (const root of ['cart', 'booking']) assert.strictEqual(visible(true, [root, 'summary']), false, root);
  });

  test('hidden when the cart is empty or the route is unknown (allow-list)', () => {
    assert.strictEqual(visible(true, ['(tabs)'], 0), false);
    assert.strictEqual(visible(true, ['some-new-screen']), false);
    assert.strictEqual(visible(true, []), false);
  });

  test('allow-list contains no auth route', () => {
    assert.ok(!CART_BANNER_ROUTES.includes('(auth)'));
  });
});
