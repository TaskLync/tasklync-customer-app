import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveNotificationRoute } from '../../src/utils/deepLink.ts';

describe('resolveNotificationRoute for Custom Requests & Quotes', () => {
  test('resolves tasklync://custom-requests/:id to /custom-request/:id', () => {
    const route = resolveNotificationRoute({
      deep_link: 'tasklync://custom-requests/req-123',
    });
    assert.strictEqual(route, '/custom-request/req-123');
  });

  test('resolves tasklync://custom-request/:id/quote to /custom-request/:id/quote', () => {
    const route = resolveNotificationRoute({
      deep_link: 'tasklync://custom-request/req-123/quote',
    });
    assert.strictEqual(route, '/custom-request/req-123/quote');
  });

  test('resolves tasklync://custom-requests/:id/chat to /chat/request/:id', () => {
    const route = resolveNotificationRoute({
      deep_link: 'tasklync://custom-requests/req-123/chat',
    });
    assert.strictEqual(route, '/chat/request/req-123');
  });

  test('resolves tasklync://quotes/:id to /custom-request/:id/quote', () => {
    const route = resolveNotificationRoute({
      deep_link: 'tasklync://quotes/q-456',
    });
    assert.strictEqual(route, '/custom-request/q-456/quote');
  });

  test('resolves template_key quote_ready with requestId', () => {
    const route = resolveNotificationRoute({
      type: 'quote_ready',
      requestId: 'req-789',
    } as any);
    assert.strictEqual(route, '/custom-request/req-789/quote');
  });

  test('resolves template_key custom_request_received with requestId', () => {
    const route = resolveNotificationRoute({
      template_key: 'custom_request_received',
      requestId: 'req-789',
    } as any);
    assert.strictEqual(route, '/custom-request/req-789');
  });

  test('resolves chat with requestId to /chat/request/:id', () => {
    const route = resolveNotificationRoute({
      type: 'chat_message',
      requestId: 'req-321',
    } as any);
    assert.strictEqual(route, '/chat/request/req-321');
  });

  test('handles null/undefined gracefully returning /notifications', () => {
    assert.strictEqual(resolveNotificationRoute(null), '/notifications');
    assert.strictEqual(resolveNotificationRoute(undefined), '/notifications');
  });
});
