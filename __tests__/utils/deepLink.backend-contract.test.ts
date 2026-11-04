import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveNotificationRoute } from '../../src/utils/deepLink.ts';
import { notificationQueue } from '../../src/services/notifications/notification-queue.ts';

// Deep links exactly as notification-service renders them for CUSTOMER-targeted templates.
const B = 'b8e4f1a2';
describe('backend deep-link contract (customer templates)', () => {
  const cases: Array<[string, string, string]> = [
    ['booking_accepted / rejected / reassigned / started / completed / cancelled_* / payment_received / refunded / dispute_resolved', `tasklync://booking/${B}`, `/booking/${B}`],
    ['dispute_response_received', `tasklync://dispute/${B}`, `/booking/${B}`],
    ['new_chat_message', `tasklync://chat/${B}`, `/booking/${B}/chat`],
    ['custom_request_declined', 'tasklync://custom-requests/REQ1', '/custom-request/REQ1'],
    ['quote_ready', 'tasklync://custom-requests/REQ1/quote', '/custom-request/REQ1/quote'],
    ['marketing / greetings', 'tasklync://home', '/(tabs)'],
    ['quote link with no request id', 'tasklync://custom-requests', '/(tabs)/bookings'],
  ];
  for (const [name, link, expected] of cases) {
    test(`${name}: ${link}`, () => {
      assert.strictEqual(resolveNotificationRoute({ deep_link: link } as any), expected);
    });
  }

  test('camelCase deepLink key is accepted too', () => {
    assert.strictEqual(resolveNotificationRoute({ deepLink: `tasklync://booking/${B}` } as any), `/booking/${B}`);
  });

  test('no deep link and no ids falls back to the notifications list, never crashes', () => {
    assert.strictEqual(resolveNotificationRoute({} as any), '/notifications');
    assert.strictEqual(resolveNotificationRoute(null), '/notifications');
  });

  test('worker-only links never open a booking screen in the customer app', () => {
    for (const l of ['tasklync://earnings', 'tasklync://verification', 'tasklync://worker/online', 'tasklync://worker/reviews']) {
      assert.strictEqual(resolveNotificationRoute({ deep_link: l } as any), '/notifications');
    }
  });
});

describe('notificationQueue', () => {
  test('a tap made before the shell mounts is delivered on attach, exactly once', async () => {
    notificationQueue.clear();
    const got: string[] = [];
    notificationQueue.enqueue('/booking/A', 'n-1');
    assert.strictEqual(notificationQueue.hasPending(), true);
    const detach = notificationQueue.attachConsumer((p) => got.push(p));
    await new Promise((r) => setTimeout(r, 120));
    assert.deepStrictEqual(got, ['/booking/A']);
    detach();
  });

  test('duplicate delivery of the same notification id is dropped; a new id navigates', async () => {
    const got: string[] = [];
    const detach = notificationQueue.attachConsumer((p) => got.push(p));
    notificationQueue.enqueue('/booking/B', 'n-2');
    notificationQueue.enqueue('/booking/B', 'n-2');
    notificationQueue.enqueue('/booking/C', 'n-3');
    await new Promise((r) => setTimeout(r, 120));
    assert.deepStrictEqual(got, ['/booking/B', '/booking/C']);
    detach();
  });

  test('with no consumer (logged out / not ready) the tap waits and is not lost', () => {
    notificationQueue.clear();
    notificationQueue.enqueue('/booking/D', 'n-4');
    assert.strictEqual(notificationQueue.hasPending(), true);
    notificationQueue.clear();
  });
});
