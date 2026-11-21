import { test, describe } from 'node:test';
import assert from 'node:assert';
import { countByRequestFilter, matchesRequestFilter, requestStatusBadge } from '../../src/utils/customRequestFilters.ts';

const ALL_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'CLARIFICATION_REQUESTED',
  'QUOTE_SENT',
  'ACCEPTED',
  'CONVERTED',
  'DECLINED',
  'CANCELLED',
  'EXPIRED',
];

describe('custom quote filters (membership unchanged)', () => {
  test('Quotes Ready = QUOTE_SENT only', () => {
    assert.deepStrictEqual(ALL_STATUSES.filter((s) => matchesRequestFilter(s, 'QUOTE_READY')), ['QUOTE_SENT']);
  });

  test('In Review = every open status', () => {
    assert.deepStrictEqual(ALL_STATUSES.filter((s) => matchesRequestFilter(s, 'ACTIVE')), [
      'SUBMITTED',
      'UNDER_REVIEW',
      'CLARIFICATION_REQUESTED',
      'QUOTE_SENT',
      'ACCEPTED',
    ]);
  });

  test('Past = every closed status', () => {
    assert.deepStrictEqual(ALL_STATUSES.filter((s) => matchesRequestFilter(s, 'RESOLVED')), [
      'CONVERTED',
      'DECLINED',
      'CANCELLED',
      'EXPIRED',
    ]);
  });

  test('every status is either open or past', () => {
    for (const s of ALL_STATUSES) {
      assert.notStrictEqual(matchesRequestFilter(s, 'ACTIVE'), matchesRequestFilter(s, 'RESOLVED'), s);
    }
  });

  test('counts match the filters', () => {
    const items = ['SUBMITTED', 'QUOTE_SENT', 'QUOTE_SENT', 'CANCELLED'].map((status) => ({ status }));
    assert.deepStrictEqual(countByRequestFilter(items), { ALL: 4, QUOTE_READY: 2, ACTIVE: 3, RESOLVED: 1 });
    assert.deepStrictEqual(countByRequestFilter([]), { ALL: 0, QUOTE_READY: 0, ACTIVE: 0, RESOLVED: 0 });
  });
});

describe('status badges', () => {
  test('labels are unchanged and every status has a readable label', () => {
    assert.strictEqual(requestStatusBadge('SUBMITTED').label, 'Submitted');
    assert.strictEqual(requestStatusBadge('QUOTE_SENT').label, 'Quote ready');
    assert.strictEqual(requestStatusBadge('CONVERTED').label, 'Booked');
    assert.strictEqual(requestStatusBadge('EXPIRED').label, 'Expired');
    for (const s of ALL_STATUSES) assert.ok(!requestStatusBadge(s).label.includes('_'), s);
  });

  test('tones follow the brief', () => {
    assert.strictEqual(requestStatusBadge('SUBMITTED').tone, 'amber');
    assert.strictEqual(requestStatusBadge('QUOTE_SENT').tone, 'green');
    assert.strictEqual(requestStatusBadge('UNDER_REVIEW').tone, 'neutral');
    assert.strictEqual(requestStatusBadge('CANCELLED').tone, 'muted');
  });
});
