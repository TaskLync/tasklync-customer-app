import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('TaskLync Custom Service Quote Financial Calculations', () => {
  test('calculates platform fee (5%) and total payable with inspection fee', () => {
    const workPrice = 2500;
    const inspectionFee = 500;
    const subtotal = workPrice + inspectionFee; // 3000
    const customerPlatformFee = Math.round(subtotal * 0.05 * 100) / 100; // 150
    const totalPrice = subtotal + customerPlatformFee; // 3150
    const workerCommission = Math.round(subtotal * 0.05 * 100) / 100; // 150
    const workerEarnings = subtotal - workerCommission; // 2850

    assert.strictEqual(subtotal, 3000);
    assert.strictEqual(customerPlatformFee, 150);
    assert.strictEqual(totalPrice, 3150);
    assert.strictEqual(workerCommission, 150);
    assert.strictEqual(workerEarnings, 2850);
  });

  test('calculates platform fee (5%) without inspection fee', () => {
    const workPrice = 1200;
    const inspectionFee = 0;
    const subtotal = workPrice + inspectionFee;
    const customerPlatformFee = Math.round(subtotal * 0.05 * 100) / 100;
    const totalPrice = subtotal + customerPlatformFee;

    assert.strictEqual(subtotal, 1200);
    assert.strictEqual(customerPlatformFee, 60);
    assert.strictEqual(totalPrice, 1260);
  });

  test('formats scheduled_at correctly from date and time slot for checkout', () => {
    const dateStr = '2026-10-26';
    const slotStr = '10:00 - 12:00';
    const timePart = slotStr.split('-')[0].trim();
    const normalizedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
    const scheduledDateTime = new Date(`${dateStr}T${normalizedTime}`);

    assert.ok(!isNaN(scheduledDateTime.getTime()));
    assert.strictEqual(scheduledDateTime.getFullYear(), 2026);
    assert.strictEqual(scheduledDateTime.getMonth(), 9); // October is 9 (0-indexed)
    assert.strictEqual(scheduledDateTime.getDate(), 26);
    assert.strictEqual(scheduledDateTime.getHours(), 10);
  });
});
