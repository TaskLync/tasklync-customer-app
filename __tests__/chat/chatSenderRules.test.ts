import { test, describe } from 'node:test';
import assert from 'node:assert';
import { classifyIncomingSender } from '../../src/utils/chatSenderRules.ts';
import { chimeHandlesChatPush, getChatPushMessageId, isChatPush } from '../../src/services/notifications/chatPush.ts';

const none = new Set<string>();
const base = { currentUserId: 'usr_1', ownTempIds: none };

describe('classifyIncomingSender: who gets the incoming chime', () => {
  test('worker message (spec payload) -> counterparty', () => {
    const r = classifyIncomingSender({ ...base, senderType: 'worker', senderId: 'wrk_9', messageType: 'text' });
    assert.deepStrictEqual(r, { isOwn: false, isSystem: false, isCounterparty: true });
  });

  test('agency / company sender without a type -> counterparty', () => {
    assert.strictEqual(classifyIncomingSender({ ...base, senderId: 'cmp_3' }).isCounterparty, true);
  });

  test("customer's own echo by senderType 'user' -> own, even if the id format differs", () => {
    const r = classifyIncomingSender({ ...base, senderType: 'user', senderId: 'chat-svc-usr-1' });
    assert.strictEqual(r.isOwn, true);
    assert.strictEqual(r.isCounterparty, false);
  });

  test('own echo by matching sender id -> own', () => {
    assert.strictEqual(classifyIncomingSender({ ...base, senderId: 'usr_1' }).isOwn, true);
  });

  test('own echo recognised by a tempId this device created', () => {
    const own = new Set(['temp_1_ab']);
    const r = classifyIncomingSender({ ...base, ownTempIds: own, echoedTempId: 'temp_1_ab', senderId: 'x' });
    assert.strictEqual(r.isOwn, true);
  });

  test("a worker message echoing the WORKER's tempId is still the worker's", () => {
    const r = classifyIncomingSender({
      ...base,
      senderType: 'worker',
      senderId: 'wrk_9',
      echoedTempId: 'worker_temp_77',
    });
    assert.strictEqual(r.isCounterparty, true);
  });

  test("placeholder 'current-user' never matches (auth not hydrated)", () => {
    const r = classifyIncomingSender({ currentUserId: 'current-user', ownTempIds: none, senderId: 'current-user', senderType: 'worker' });
    assert.strictEqual(r.isCounterparty, true);
  });

  test('system messages never chime', () => {
    assert.strictEqual(classifyIncomingSender({ ...base, senderType: 'system' }).isCounterparty, false);
    assert.strictEqual(classifyIncomingSender({ ...base, senderType: 'worker', messageType: 'system' }).isCounterparty, false);
  });
});

describe('chat push: exactly one sound in the foreground', () => {
  test('chat push with a message id -> in-app chime handles it (OS sound suppressed)', () => {
    assert.strictEqual(chimeHandlesChatPush({ type: 'new_chat_message', message_id: 'msg_1' }), true);
    assert.strictEqual(getChatPushMessageId({ messageId: ' msg_2 ' }), 'msg_2');
  });

  test('chat push without a message id -> OS sound (no un-dedupable chime)', () => {
    assert.strictEqual(isChatPush({ type: 'chat' }), true);
    assert.strictEqual(chimeHandlesChatPush({ type: 'chat' }), false);
  });

  test('non-chat push -> OS sound, no chime', () => {
    assert.strictEqual(chimeHandlesChatPush({ type: 'booking_accepted', message_id: 'x' }), false);
    assert.strictEqual(chimeHandlesChatPush(undefined), false);
  });
});
