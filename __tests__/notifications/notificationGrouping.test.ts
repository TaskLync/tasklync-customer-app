import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  groupNotificationsByDate,
  formatRelativeTime,
} from '../../src/utils/groupByDate.ts';
import type { NotificationItem } from '../../src/types/notification.types.ts';

describe('Notification Grouping & Formatting Engine', () => {
  const createMockItem = (overrides: Partial<NotificationItem>): NotificationItem => ({
    id: `notif-${Math.random().toString(36).substring(2, 9)}`,
    user_id: 'user-1',
    category: 'booking',
    title: 'Booking Confirmed',
    body: 'Your AC Repair service is scheduled for 3:00 PM.',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  test('returns empty grouped result for empty array or null input', () => {
    const emptyResult = groupNotificationsByDate([]);
    assert.strictEqual(emptyResult.groupedItems.length, 0);
    assert.strictEqual(emptyResult.stickyHeaderIndices.length, 0);
    assert.strictEqual(emptyResult.totalNotifications, 0);
    assert.strictEqual(emptyResult.totalUnread, 0);

    const nullResult = groupNotificationsByDate(null as any);
    assert.strictEqual(nullResult.groupedItems.length, 0);
  });

  test('groups notifications accurately into Today, Yesterday, and Earlier buckets', () => {
    const now = new Date();

    // 1. Today item (10 mins ago)
    const todayDate = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const itemToday = createMockItem({
      id: 'item-today',
      title: 'Technician Assigned',
      is_read: false,
      created_at: todayDate,
    });

    // 2. Yesterday item (26 hours ago)
    const yesterdayDate = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();
    const itemYesterday = createMockItem({
      id: 'item-yesterday',
      title: 'Payment Received',
      is_read: true,
      created_at: yesterdayDate,
    });

    // 3. Earlier item (5 days ago)
    const earlierDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const itemEarlier = createMockItem({
      id: 'item-earlier',
      title: 'Welcome to TaskLync',
      is_read: true,
      created_at: earlierDate,
    });

    const result = groupNotificationsByDate([itemToday, itemYesterday, itemEarlier]);

    // Expect 3 headers + 3 notification items = 6 items total
    assert.strictEqual(result.groupedItems.length, 6);
    assert.strictEqual(result.totalNotifications, 3);
    assert.strictEqual(result.totalUnread, 1);

    // Verify Headers
    assert.strictEqual(result.groupedItems[0].type, 'header');
    assert.strictEqual((result.groupedItems[0] as any).title, 'Today');
    assert.strictEqual(result.groupedItems[1].type, 'notification');
    assert.strictEqual((result.groupedItems[1] as any).notification.id, 'item-today');

    assert.strictEqual(result.groupedItems[2].type, 'header');
    assert.strictEqual((result.groupedItems[2] as any).title, 'Yesterday');
    assert.strictEqual(result.groupedItems[3].type, 'notification');
    assert.strictEqual((result.groupedItems[3] as any).notification.id, 'item-yesterday');

    assert.strictEqual(result.groupedItems[4].type, 'header');
    assert.strictEqual((result.groupedItems[4] as any).title, 'Earlier');
    assert.strictEqual(result.groupedItems[5].type, 'notification');
    assert.strictEqual((result.groupedItems[5] as any).notification.id, 'item-earlier');

    // Sticky header indices must point to headers at positions 0, 2, 4
    assert.deepStrictEqual(result.stickyHeaderIndices, [0, 2, 4]);
  });

  test('omits headers for sections that have zero notifications', () => {
    const now = new Date();

    // Only items from 4 days ago (no Today, no Yesterday)
    const earlier1 = createMockItem({
      id: 'early-1',
      title: 'Offer 1',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const early2 = createMockItem({
      id: 'early-2',
      title: 'Offer 2',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const result = groupNotificationsByDate([earlier1, early2]);

    // Only 1 header ("Earlier") and 2 notifications = 3 items total
    assert.strictEqual(result.groupedItems.length, 3);
    assert.strictEqual(result.groupedItems[0].type, 'header');
    assert.strictEqual((result.groupedItems[0] as any).title, 'Earlier');
    assert.deepStrictEqual(result.stickyHeaderIndices, [0]);
  });

  test('formats relative time strings accurately', () => {
    const now = Date.now();

    // < 1 min -> "Just now"
    assert.strictEqual(formatRelativeTime(new Date(now - 15 * 1000).toISOString()), 'Just now');

    // 15 mins ago -> "15m ago"
    assert.strictEqual(formatRelativeTime(new Date(now - 15 * 60 * 1000).toISOString()), '15m ago');

    // 3 hours ago -> "3h ago"
    assert.strictEqual(formatRelativeTime(new Date(now - 3 * 3600 * 1000).toISOString()), '3h ago');

    // 1 day ago -> "Yesterday"
    assert.strictEqual(formatRelativeTime(new Date(now - 25 * 3600 * 1000).toISOString()), 'Yesterday');

    // 4 days ago -> "4d ago"
    assert.strictEqual(formatRelativeTime(new Date(now - 4 * 24 * 3600 * 1000).toISOString()), '4d ago');

    // Handles null / empty
    assert.strictEqual(formatRelativeTime(null), '');
    assert.strictEqual(formatRelativeTime(undefined), '');
    assert.strictEqual(formatRelativeTime('invalid-date'), '');
  });

  test('dynamically formats filter tab text with unread count', () => {
    function formatUnreadFilterTab(unreadCount: number): string {
      return unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread';
    }

    assert.strictEqual(formatUnreadFilterTab(0), 'Unread');
    assert.strictEqual(formatUnreadFilterTab(1), 'Unread (1)');
    assert.strictEqual(formatUnreadFilterTab(14), 'Unread (14)');
  });
});
