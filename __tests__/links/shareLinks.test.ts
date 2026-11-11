import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  buildPlayStoreUrl,
  buildShareMessage,
  buildShareUrl,
  parsePlayInstallReferrer,
  parseShareLink,
  routeFor,
} from '../../src/utils/shareLinks.ts';

const ID = '3f2b8c1e-4d5a-4e6f-9a0b-1c2d3e4f5a6b';

describe('parseShareLink', () => {
  test('accepts https share URLs for worker and company', () => {
    assert.deepStrictEqual(parseShareLink(`https://tasklync.pk/worker/${ID}`), { type: 'worker', id: ID });
    assert.deepStrictEqual(parseShareLink(`https://tasklync.pk/company/${ID}/`), { type: 'company', id: ID });
    assert.deepStrictEqual(parseShareLink(`https://www.tasklync.pk/worker/${ID}?utm_source=whatsapp#x`), {
      type: 'worker',
      id: ID,
    });
  });

  test('accepts app-scheme and bare paths', () => {
    assert.deepStrictEqual(parseShareLink(`tasklync://worker/${ID}`), { type: 'worker', id: ID });
    assert.deepStrictEqual(parseShareLink(`/worker/${ID}`), { type: 'worker', id: ID });
  });

  test('rejects foreign hosts, lookalikes, http, credentials and ports', () => {
    for (const bad of [
      `https://evil.com/worker/${ID}`,
      `https://tasklync.pk.evil.com/worker/${ID}`,
      `https://nottasklync.pk/worker/${ID}`,
      `http://tasklync.pk/worker/${ID}`,
      `https://user:pw@tasklync.pk/worker/${ID}`,
      `https://tasklync.pk:8443/worker/${ID}`,
    ]) {
      assert.strictEqual(parseShareLink(bad), null, bad);
    }
  });

  test('rejects unknown entities, extra segments, traversal and junk ids', () => {
    for (const bad of [
      `https://tasklync.pk/booking/${ID}`,
      `https://tasklync.pk/worker/${ID}/reviews`,
      'https://tasklync.pk/worker',
      'https://tasklync.pk/worker/..%2F..%2Fadmin',
      'https://tasklync.pk/worker/a',
      'https://tasklync.pk/worker/ab cd ef gh',
      '/worker/<script>alert(1)</script>',
      '',
      'tasklync.pk/worker/' + ID,
    ]) {
      assert.strictEqual(parseShareLink(bad), null, bad);
    }
    assert.strictEqual(parseShareLink(null), null);
    assert.strictEqual(parseShareLink(undefined), null);
  });
});

describe('build + round trip', () => {
  test('buildShareUrl is permanent and entity based', () => {
    assert.strictEqual(buildShareUrl('worker', ID), `https://tasklync.pk/worker/${ID}`);
    assert.throws(() => buildShareUrl('worker', 'bad id'));
  });

  test('a built URL parses back to the same route', () => {
    const t = parseShareLink(buildShareUrl('company', ID))!;
    assert.strictEqual(routeFor(t), `/company/${ID}`);
  });

  test('share message embeds the link (Android ignores Share.url)', () => {
    assert.ok(buildShareMessage('Hi', 'worker', ID).includes(`https://tasklync.pk/worker/${ID}`));
  });
});

describe('deferred deep link referrer', () => {
  test('Play Store URL carries the destination and parses back', () => {
    const url = new URL(buildPlayStoreUrl({ type: 'worker', id: ID }));
    assert.strictEqual(url.searchParams.get('id'), 'com.tasklync.user');
    const referrer = url.searchParams.get('referrer')!;
    assert.deepStrictEqual(parsePlayInstallReferrer(referrer), { type: 'worker', id: ID });
  });

  test('ignores organic installs and tampered referrers', () => {
    assert.strictEqual(parsePlayInstallReferrer(''), null);
    assert.strictEqual(parsePlayInstallReferrer('utm_source=google-play&utm_medium=organic'), null);
    assert.strictEqual(parsePlayInstallReferrer('link=https://evil.com/worker/' + ID), null);
    assert.strictEqual(parsePlayInstallReferrer('link=/admin/delete'), null);
  });
});
