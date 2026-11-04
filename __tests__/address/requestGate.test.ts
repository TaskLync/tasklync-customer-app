import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createRequestGate } from '../../src/utils/requestGate.ts';

describe('createRequestGate (latest request wins)', () => {
  test('an older ticket is rejected once a newer one starts', () => {
    const gate = createRequestGate();
    const first = gate.next();
    const second = gate.next();
    assert.strictEqual(gate.isLatest(first), false);
    assert.strictEqual(gate.isLatest(second), true);
  });

  test('invalidate() discards every in-flight request', () => {
    const gate = createRequestGate();
    const t = gate.next();
    gate.invalidate();
    assert.strictEqual(gate.isLatest(t), false);
  });
});
