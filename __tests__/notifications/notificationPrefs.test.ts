import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_NOTIFICATION_PREFS as D,
  buildCategoryPayload,
  categoryOfKey,
  mergeCategoryFrom,
  normalizeServerPreferences,
  togglePrefKey,
} from '../../src/utils/notificationPrefs.ts';

describe('notification preference mapping', () => {
  test('each switch toggles only its own value', () => {
    const keys = ['push.booking_updates', 'push.chat_messages', 'push.promotions', 'sms.booking_confirmations'] as const;
    for (const k of keys) {
      const next = togglePrefKey(D, k);
      const changed = [
        next.push.booking_updates !== D.push.booking_updates,
        next.push.chat_messages !== D.push.chat_messages,
        next.push.promotions !== D.push.promotions,
        next.sms.booking_confirmations !== D.sms.booking_confirmations,
      ].filter(Boolean).length;
      assert.strictEqual(changed, 1, k);
      assert.deepStrictEqual(togglePrefKey(next, k), D, `${k} toggles back`);
    }
  });

  test('switch → server category', () => {
    assert.strictEqual(categoryOfKey('push.booking_updates'), 'booking');
    assert.strictEqual(categoryOfKey('sms.booking_confirmations'), 'booking');
    assert.strictEqual(categoryOfKey('push.chat_messages'), 'chat');
    assert.strictEqual(categoryOfKey('push.promotions'), 'marketing');
  });

  test('Booking push + Booking SMS changed together are sent together (no overwrite)', () => {
    const server = { category: 'booking' as const, push_enabled: true, sms_enabled: true, email_enabled: true };
    let ui = togglePrefKey(D, 'push.booking_updates'); // push off
    ui = togglePrefKey(ui, 'sms.booking_confirmations'); // sms off
    assert.deepStrictEqual(buildCategoryPayload(ui, 'booking', server), {
      category: 'booking',
      push_enabled: false,
      sms_enabled: false,
      email_enabled: true, // carried over, not reset
    });
  });

  test('fields the screen does not edit are carried over from the server', () => {
    const chat = { category: 'chat' as const, push_enabled: true, sms_enabled: true, email_enabled: true };
    const ui = togglePrefKey(D, 'push.chat_messages');
    assert.deepStrictEqual(buildCategoryPayload(ui, 'chat', chat), {
      category: 'chat',
      push_enabled: false,
      sms_enabled: true,
      email_enabled: true,
    });
  });

  test('server list → UI state, with safe defaults for missing categories', () => {
    const p = normalizeServerPreferences([
      { category: 'booking', push_enabled: false, sms_enabled: false, email_enabled: false },
      { category: 'marketing', push_enabled: true, sms_enabled: false, email_enabled: false },
    ]);
    assert.deepStrictEqual(p, {
      push: { booking_updates: false, chat_messages: true, promotions: true },
      sms: { booking_confirmations: false },
    });
  });

  test('a failed save reverts only its own category', () => {
    let ui = togglePrefKey(D, 'push.promotions');
    ui = togglePrefKey(ui, 'push.chat_messages');
    const reverted = mergeCategoryFrom(ui, D, 'marketing');
    assert.strictEqual(reverted.push.promotions, D.push.promotions);
    assert.strictEqual(reverted.push.chat_messages, !D.push.chat_messages, 'chat change kept');
  });
});
