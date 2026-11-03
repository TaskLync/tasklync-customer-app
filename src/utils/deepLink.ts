import type { RawNotificationPayload } from '../types/notification.types';

/**
 * Resolves a raw notification data payload or deep link URL into an Expo Router path.
 * Covers all 16 backend push templates in notification-service with zero crash risk.
 */
export function resolveNotificationRoute(payload?: RawNotificationPayload | null): string {
  if (!payload) return '/notifications';

  // 1. Direct explicit deep_link scheme (e.g. tasklync://booking/123, tasklync://chat/456, tasklync://home)
  const deepLink = payload.deep_link || payload.deepLink;
  if (typeof deepLink === 'string' && deepLink.trim().length > 0) {
    const cleanUrl = deepLink.trim();
    if (cleanUrl.startsWith('tasklync://')) {
      const relativePath = cleanUrl.replace('tasklync://', '').replace(/^\/+/, '');
      const segments = relativePath.split('/');
      const section = segments[0]?.toLowerCase();
      const targetId = segments[1];

      if (section === 'booking' && targetId) {
        const subAction = segments[2]?.toLowerCase();
        if (subAction === 'chat') {
          return `/booking/${targetId}/chat`;
        }
        if (subAction === 'track') {
          return `/booking/${targetId}/track`;
        }
        return `/booking/${targetId}`;
      }
      if (section === 'chat' && targetId) {
        return `/booking/${targetId}/chat`;
      }
      if (section === 'track' && targetId) {
        return `/booking/${targetId}/track`;
      }
      if (section === 'home') {
        return '/(tabs)';
      }
      if (section === 'notifications') {
        return '/notifications';
      }
      if (section === 'cart') {
        return '/cart';
      }
      if (section === 'custom-requests' || section === 'custom-request') {
        if (targetId) {
          if (segments[2] === 'quote') {
            return `/custom-request/${targetId}/quote`;
          }
          if (segments[2] === 'chat') {
            return `/chat/request/${targetId}`;
          }
          return `/custom-request/${targetId}`;
        }
        return '/(tabs)/bookings';
      }
      if (section === 'quotes' || section === 'quote') {
        if (targetId) {
          return `/custom-request/${targetId}/quote`;
        }
        return '/(tabs)/bookings';
      }
      if (section === 'worker' && targetId && targetId !== 'profile' && targetId !== 'reviews') {
        return `/worker/${targetId}`;
      }
      return '/notifications';
    } else if (cleanUrl.startsWith('/')) {
      return cleanUrl;
    }
  }

  // 2. Extract entity IDs
  const bookingId = payload.bookingId || payload.booking_id || payload.booking_uuid;
  const conversationId = payload.conversationId || payload.conversation_id;
  const workerId = payload.workerId || payload.worker_id;
  const requestId = (payload as any).requestId || (payload as any).request_id || (payload as any).customRequestId || (payload as any).custom_request_id;
  const quoteId = (payload as any).quoteId || (payload as any).quote_id;
  const type = (payload.type || payload.template_key || payload.templateKey || '').toLowerCase();

  // 3. Resolve based on event type / template key
  if (type.includes('quote')) {
    if (requestId) return `/custom-request/${requestId}/quote`;
    if (quoteId) return `/custom-request/${quoteId}/quote`;
    return '/(tabs)/bookings';
  }

  if (type.includes('custom_request') || type.includes('custom-request')) {
    if (requestId) return `/custom-request/${requestId}`;
    return '/(tabs)/bookings';
  }

  if (type.includes('chat') || type.includes('message')) {
    if (requestId) {
      return `/chat/request/${requestId}`;
    }
    const targetBooking = bookingId || conversationId;
    if (targetBooking) {
      return `/booking/${targetBooking}/chat`;
    }
  }

  if (type.includes('arrival') || type.includes('arrived') || type.includes('track') || type.includes('en_route')) {
    if (bookingId) {
      return `/booking/${bookingId}/track`;
    }
  }

  if (type.startsWith('booking_') || type.startsWith('payment_') || type.startsWith('review_') || type.startsWith('dispute_')) {
    if (bookingId) {
      return `/booking/${bookingId}`;
    }
  }

  if (workerId && type.includes('worker')) {
    return `/worker/${workerId}`;
  }

  if (bookingId) {
    return `/booking/${bookingId}`;
  }

  // Default safe landing
  return '/notifications';
}
