import { test, describe } from 'node:test';
import assert from 'node:assert';
import { classifyMessageChange } from '../../src/utils/newMessageTracking.ts';

const m = (id: string, sender: 'user' | 'worker' = 'worker', temp_id?: string) => ({
  id,
  sender_type: sender,
  ...(temp_id ? { temp_id } : {}),
});

describe('classifyMessageChange', () => {
  test('older page prepended while reading history is NOT a new message', () => {
    const before = [m('b'), m('c')];
    const after = [m('a'), ...before]; // history loaded, newest unchanged
    const action = classifyMessageChange({ prevNewestKey: 'c', messages: after, isAtBottom: false });
    assert.deepStrictEqual(action, { kind: 'none' });
  });

  test('incoming message while scrolled up counts as unread and does not scroll', () => {
    const msgs = [m('a'), m('b'), m('c')];
    const action = classifyMessageChange({ prevNewestKey: 'b', messages: msgs, isAtBottom: false });
    assert.deepStrictEqual(action, { kind: 'unread', count: 1 });
  });

  test('several incoming at once are counted', () => {
    const msgs = [m('a'), m('b'), m('c'), m('d')];
    const action = classifyMessageChange({ prevNewestKey: 'a', messages: msgs, isAtBottom: false });
    assert.deepStrictEqual(action, { kind: 'unread', count: 3 });
  });

  test('incoming message while at bottom follows the conversation', () => {
    const action = classifyMessageChange({ prevNewestKey: 'a', messages: [m('a'), m('b')], isAtBottom: true });
    assert.deepStrictEqual(action, { kind: 'scroll' });
  });

  test('own message always scrolls, even when reading history', () => {
    const action = classifyMessageChange({
      prevNewestKey: 'a',
      messages: [m('a'), m('b', 'user')],
      isAtBottom: false,
    });
    assert.deepStrictEqual(action, { kind: 'scroll' });
  });

  test('optimistic temp id replaced by server id is not a new arrival', () => {
    const msgs = [m('a'), m('srv-1', 'user', 'tmp-1')];
    // previously newest was keyed by temp id 'tmp-1'; now key is still temp_id → unchanged
    assert.deepStrictEqual(
      classifyMessageChange({ prevNewestKey: 'tmp-1', messages: msgs, isAtBottom: false }),
      { kind: 'none' }
    );
    // if the temp id was dropped, the previous key matches nothing new at the tail
    const dropped = [m('a'), m('srv-1', 'user')];
    assert.deepStrictEqual(
      classifyMessageChange({ prevNewestKey: 'srv-1', messages: dropped, isAtBottom: false }),
      { kind: 'none' }
    );
  });

  test('first message in an empty conversation scrolls without a pill', () => {
    const action = classifyMessageChange({ prevNewestKey: null, messages: [m('a')], isAtBottom: false });
    assert.deepStrictEqual(action, { kind: 'scroll' });
  });

  test('empty list / unchanged newest does nothing', () => {
    assert.deepStrictEqual(classifyMessageChange({ prevNewestKey: null, messages: [], isAtBottom: true }), { kind: 'none' });
    assert.deepStrictEqual(classifyMessageChange({ prevNewestKey: 'a', messages: [m('a')], isAtBottom: true }), { kind: 'none' });
  });
});
