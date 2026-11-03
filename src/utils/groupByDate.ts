import type {
  NotificationItem,
  NotificationListItem,
  NotificationHeaderItem,
  NotificationRowItem,
} from '../types/notification.types.ts';

export interface GroupedNotificationsResult {
  groupedItems: NotificationListItem[];
  stickyHeaderIndices: number[];
  totalNotifications: number;
  totalUnread: number;
}

/**
 * Pure date formatting helper for relative timestamps:
 * - < 1 min: "Just now"
 * - < 60 min: "Xm ago"
 * - < 24 hours: "Xh ago"
 * - 1 day ago: "Yesterday"
 * - < 7 days: "Xd ago"
 * - Older: "MMM d" (e.g. "Aug 19") or "MMM d, yyyy" if different year
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    const isCurrentYear = date.getFullYear() === now.getFullYear();
    const options: Intl.DateTimeFormatOptions = isCurrentYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };

    return date.toLocaleDateString(undefined, options);
  } catch {
    return '';
  }
}

/**
 * Formats a date header string:
 * - "Today"
 * - "Yesterday"
 * - "Month Day, Year" / "Month Day" for older
 */
export function formatGroupHeaderTitle(dateKey: string, sampleDate: Date): string {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateKey === todayKey) {
    return 'Today';
  }
  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }

  const isCurrentYear = sampleDate.getFullYear() === now.getFullYear();
  if (isCurrentYear) {
    return sampleDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return sampleDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Pure function: takes flat NotificationItem[] and returns flat NotificationListItem[]
 * grouped into intuitive sections: "Today", "Yesterday", and "Earlier" (only when relevant).
 *
 * Re-indexes stickyHeaderIndices for FlashList.
 */
export function groupNotificationsByDate(
  items: NotificationItem[]
): GroupedNotificationsResult {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      groupedItems: [],
      stickyHeaderIndices: [],
      totalNotifications: 0,
      totalUnread: 0,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const todayItems: NotificationItem[] = [];
  const yesterdayItems: NotificationItem[] = [];
  const earlierItems: NotificationItem[] = [];

  let totalUnread = 0;

  for (const item of items) {
    if (!item) continue;
    if (!item.is_read) {
      totalUnread += 1;
    }

    let timestamp: number;
    try {
      const d = new Date(item.created_at);
      timestamp = isNaN(d.getTime()) ? Date.now() : d.getTime();
    } catch {
      timestamp = Date.now();
    }

    if (timestamp >= todayStart) {
      todayItems.push(item);
    } else if (timestamp >= yesterdayStart) {
      yesterdayItems.push(item);
    } else {
      earlierItems.push(item);
    }
  }

  const buckets: Array<{ id: string; title: string; items: NotificationItem[] }> = [
    { id: 'today', title: 'Today', items: todayItems },
    { id: 'yesterday', title: 'Yesterday', items: yesterdayItems },
    { id: 'earlier', title: 'Earlier', items: earlierItems },
  ];

  const groupedItems: NotificationListItem[] = [];
  const stickyHeaderIndices: number[] = [];

  for (const bucket of buckets) {
    if (bucket.items.length === 0) {
      continue;
    }

    const headerIndex = groupedItems.length;
    stickyHeaderIndices.push(headerIndex);

    const headerItem: NotificationHeaderItem = {
      type: 'header',
      id: `header_${bucket.id}`,
      title: bucket.title,
      dateKey: bucket.id,
      count: bucket.items.length,
    };
    groupedItems.push(headerItem);

    // Add each notification row item
    for (const notification of bucket.items) {
      const rowItem: NotificationRowItem = {
        type: 'notification',
        id: notification.id,
        notification,
      };
      groupedItems.push(rowItem);
    }
  }

  return {
    groupedItems,
    stickyHeaderIndices,
    totalNotifications: items.length,
    totalUnread,
  };
}
