import type { NotificationPreferences, NotificationPrefKey } from '../types/settings.types';
import type { CategoryPreference, NotificationCategory, UpdatePreferencePayload } from '../types/notification.types';

/**
 * Pure mapping between the Settings UI (4 switches) and the server's per-category records.
 *   Booking Updates        → booking.push_enabled
 *   SMS Confirmations Only → booking.sms_enabled   (same record as Booking Updates)
 *   Chat Messages          → chat.push_enabled
 *   Promotions & Offers    → marketing.push_enabled
 */

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  push: { booking_updates: true, chat_messages: true, promotions: false },
  sms: { booking_confirmations: true },
};

export function normalizeServerPreferences(rawList: CategoryPreference[]): NotificationPreferences {
  const map = new Map(rawList.map((p) => [p.category, p]));
  const booking = map.get('booking');
  const chat = map.get('chat');
  const marketing = map.get('marketing');
  return {
    push: {
      booking_updates: booking?.push_enabled ?? true,
      chat_messages: chat?.push_enabled ?? true,
      promotions: marketing?.push_enabled ?? false,
    },
    sms: {
      booking_confirmations: booking?.sms_enabled ?? true,
    },
  };
}

export function categoryOfKey(key: NotificationPrefKey): NotificationCategory {
  if (key === 'push.chat_messages') return 'chat';
  if (key === 'push.promotions') return 'marketing';
  return 'booking';
}

export function togglePrefKey(p: NotificationPreferences, key: NotificationPrefKey): NotificationPreferences {
  switch (key) {
    case 'push.booking_updates':
      return { ...p, push: { ...p.push, booking_updates: !p.push.booking_updates } };
    case 'push.chat_messages':
      return { ...p, push: { ...p.push, chat_messages: !p.push.chat_messages } };
    case 'push.promotions':
      return { ...p, push: { ...p.push, promotions: !p.push.promotions } };
    case 'sms.booking_confirmations':
      return { ...p, sms: { ...p.sms, booking_confirmations: !p.sms.booking_confirmations } };
  }
}

/**
 * Full PUT payload for one category from the CURRENT UI state. Values the UI does not edit
 * (email everywhere, SMS for chat/marketing) are carried over from the server record, never reset.
 */
export function buildCategoryPayload(
  p: NotificationPreferences,
  category: NotificationCategory,
  server: CategoryPreference | undefined
): UpdatePreferencePayload {
  const email_enabled = server?.email_enabled ?? false;
  if (category === 'booking') {
    return { category, push_enabled: p.push.booking_updates, sms_enabled: p.sms.booking_confirmations, email_enabled };
  }
  if (category === 'chat') {
    return { category, push_enabled: p.push.chat_messages, sms_enabled: server?.sms_enabled ?? false, email_enabled };
  }
  return { category, push_enabled: p.push.promotions, sms_enabled: server?.sms_enabled ?? false, email_enabled };
}

/** `target` with the UI fields of `category` copied from `source`. */
export function mergeCategoryFrom(
  target: NotificationPreferences,
  source: NotificationPreferences,
  category: NotificationCategory
): NotificationPreferences {
  if (category === 'booking') {
    return {
      push: { ...target.push, booking_updates: source.push.booking_updates },
      sms: { ...target.sms, booking_confirmations: source.sms.booking_confirmations },
    };
  }
  if (category === 'chat') return { ...target, push: { ...target.push, chat_messages: source.push.chat_messages } };
  return { ...target, push: { ...target.push, promotions: source.push.promotions } };
}
