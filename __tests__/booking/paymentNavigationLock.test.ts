import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { createNavigationLock } from '../../src/hooks/navigationLock.core.ts';

const src = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('payment screen navigation lock (TEST 3)', () => {
  test('Android hardware back is consumed while locked and tells the customer why', () => {
    let blocked = 0;
    const lock = createNavigationLock(() => { blocked++; });
    assert.strictEqual(lock.onHardwareBack(), true); // true = handled, the navigator never pops the screen
    assert.strictEqual(lock.onHardwareBack(), true);
    assert.strictEqual(blocked, 2);
  });

  test('any back action (header, router.back(), POP, GO_BACK) is prevented via beforeRemove', () => {
    let prevented = 0;
    const lock = createNavigationLock();
    lock.onBeforeRemove({ preventDefault: () => { prevented++; } });
    assert.strictEqual(prevented, 1);
  });

  test('after release() the intentional exit (to success / My Bookings) goes through', () => {
    let prevented = 0;
    let blocked = 0;
    const lock = createNavigationLock(() => { blocked++; });
    lock.release();
    assert.strictEqual(lock.onHardwareBack(), false); // let the system handle it
    lock.onBeforeRemove({ preventDefault: () => { prevented++; } });
    assert.strictEqual(prevented, 0);
    assert.strictEqual(blocked, 0);
  });

  test('the latest onBlocked handler is used (no stale closure after re-render)', () => {
    const calls: string[] = [];
    const lock = createNavigationLock(() => calls.push('old'));
    lock.setOnBlocked(() => calls.push('new'));
    lock.onHardwareBack();
    assert.deepStrictEqual(calls, ['new']);
  });
});

/**
 * Wiring checks on the screen sources. These are static assertions (the app has no React Native renderer in its
 * test setup); they pin the exact lines that make the lock effective so a refactor cannot silently drop them.
 */
describe('booking funnel wiring', () => {
  test('summary (COD only) records COD and REPLACES itself with the success screen, bypassing payment', () => {
    const s = src('app/booking/summary.tsx');
    const goToSuccess = s.slice(s.indexOf('const goToSuccess'), s.indexOf('const handleDiscountFailure'));
    assert.ok(goToSuccess.length > 0, 'goToSuccess exists');
    assert.match(goToSuccess, /initiateCodPayment\(/);
    assert.match(goToSuccess, /router\.replace\(\{\s*pathname: '\/booking\/success'/);
    assert.doesNotMatch(goToSuccess, /\/booking\/payment/);
    assert.doesNotMatch(goToSuccess, /router\.push/);
    assert.ok(
      goToSuccess.lastIndexOf('finishCheckout();') < goToSuccess.indexOf("router.replace({ pathname: '/booking/success'"),
      'cart and idempotency key are cleared before showing success',
    );
  });

  test('payment hides the header back icon and installs the lock', () => {
    const p = src('app/booking/payment.tsx');
    assert.match(p, /<PaymentHeader title="Payment" showBack=\{false\} \/>/);
    assert.match(p, /useNavigationLock\(/);
    const goToSuccess = p.slice(p.indexOf('const goToSuccess'), p.indexOf('const paying'));
    assert.ok(goToSuccess.indexOf('release();') !== -1, 'goToSuccess releases the lock');
    assert.ok(
      goToSuccess.indexOf('release();') < goToSuccess.indexOf("router.replace({ pathname: '/booking/success'"),
      'the lock is released BEFORE replacing with the success screen',
    );
  });

  test('payment has iOS swipe-back disabled in the root stack', () => {
    assert.match(src('app/_layout.tsx'), /name="booking\/payment" options=\{\{[^}]*gestureEnabled: false/);
  });

  test('the lock hook removes both listeners on unmount', () => {
    const h = src('src/hooks/useNavigationLock.ts');
    assert.match(h, /backSub\.remove\(\);\s*unsubscribe\(\);/);
  });
});
