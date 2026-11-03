import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { colors } from '../../design/colors';

export interface AndroidChannelConfig {
  channelId: string;
  name: string;
  importance: Notifications.AndroidImportance;
  vibrationPattern?: number[];
  sound?: string | null;
  lightColor?: string;
  description?: string;
  enableLights?: boolean;
  enableVibrate?: boolean;
  showBadge?: boolean;
}

/**
 * Complete Android Notification Channel Registry.
 * Guarantees that any notification dispatched by any backend service (FCM / Expo Push / Local)
 * finds a pre-registered channel on Android 8.0+ (API 26 through API 35+).
 */
export const ANDROID_CHANNELS: AndroidChannelConfig[] = [
  // 1. Backend Service Primary Channels
  {
    channelId: 'tasklync_job_alerts',
    name: 'Job & Booking Alerts',
    description: 'Urgent alerts for new booking requests, acceptance, and worker dispatch',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.primaryDark,
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'tasklync_general_notifications',
    name: 'General Notifications',
    description: 'Account updates, status alerts, and service announcements',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    lightColor: colors.primaryDark,
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'tasklync_chat_notifications',
    name: 'Chat & Messages',
    description: 'Real-time messages from service professionals',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    sound: 'default',
    lightColor: colors.primaryDark,
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'tasklync_booking_alerts',
    name: 'Booking Updates',
    description: 'Status changes, worker arrival, and job progress updates',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    lightColor: colors.primaryDark,
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'tasklync_payment_alerts',
    name: 'Payments & Receipts',
    description: 'Payment confirmations, receipts, refunds, and invoice notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    sound: 'default',
    lightColor: colors.primaryDark,
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'tasklync_marketing_notifications',
    name: 'Offers & Promotions',
    description: 'Seasonal discounts, promotions, and tips',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    showBadge: false,
  },

  // 2. Short-Form Standard Channels (Legacy / Client Routing)
  {
    channelId: 'booking',
    name: 'Booking Updates',
    description: 'Critical notifications for booking acceptance and arrival',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.primaryDark,
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'chat',
    name: 'Chat Messages',
    description: 'Real-time messages from assigned workers',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    sound: 'default',
    lightColor: colors.primaryDark,
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'payment',
    name: 'Payments',
    description: 'Payment confirmations and receipts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: colors.primaryDark,
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
  {
    channelId: 'marketing',
    name: 'Promotions',
    description: 'Discounts and service recommendations',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    showBadge: false,
  },
  {
    channelId: 'default',
    name: 'Default',
    description: 'System alerts and notifications',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    lightColor: colors.primaryDark,
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  },
];

export const IOS_CATEGORIES: Notifications.NotificationCategory[] = [
  {
    identifier: 'booking_alert',
    actions: [
      {
        identifier: 'VIEW_BOOKING',
        buttonTitle: 'View Booking',
        options: {
          opensAppToForeground: true,
        },
      },
    ],
  },
  {
    identifier: 'chat_message',
    actions: [
      {
        identifier: 'REPLY_CHAT',
        buttonTitle: 'Reply',
        options: {
          opensAppToForeground: true,
        },
      },
    ],
  },
];

/**
 * Registers all Android notification channels and iOS categories with the OS safely.
 * Prevents native BadNotificationException and IllegalArgumentException on Android.
 */
export async function setupNotificationChannelsAndCategories(): Promise<void> {
  if (Platform.OS === 'android') {
    for (const ch of ANDROID_CHANNELS) {
      try {
        const channelInput: Notifications.NotificationChannelInput = {
          name: ch.name,
          importance: ch.importance,
          showBadge: ch.showBadge ?? true,
        };

        if (ch.description) {
          channelInput.description = ch.description;
        }

        if (ch.lightColor) {
          channelInput.lightColor = ch.lightColor;
          channelInput.enableLights = ch.enableLights ?? true;
        }

        if (ch.vibrationPattern && ch.vibrationPattern.length > 0) {
          channelInput.vibrationPattern = ch.vibrationPattern;
          channelInput.enableVibrate = ch.enableVibrate ?? true;
        } else if (ch.enableVibrate === false) {
          channelInput.enableVibrate = false;
        }

        if (ch.sound !== undefined) {
          channelInput.sound = ch.sound;
        }

        await Notifications.setNotificationChannelAsync(ch.channelId, channelInput);
      } catch (err) {
        if (__DEV__) {
          console.warn(`[notification-categories] Non-fatal channel registration notice (${ch.channelId}):`, err);
        }
      }
    }
  }

  if (Platform.OS === 'ios') {
    for (const cat of IOS_CATEGORIES) {
      try {
        await Notifications.setNotificationCategoryAsync(cat.identifier, cat.actions, cat.options ?? {});
      } catch (err) {
        if (__DEV__) {
          console.warn(`[notification-categories] Non-fatal category registration notice (${cat.identifier}):`, err);
        }
      }
    }
  }
}
