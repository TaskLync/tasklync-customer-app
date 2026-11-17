import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createMMKV } from 'react-native-mmkv';
import { notificationApi } from '../services/api/notification.api';
import { useUIStore } from '../store/ui.store';
import { NotificationPreferences, NotificationPrefKey } from '../types/settings.types';
import { CategoryPreference, NotificationCategory } from '../types/notification.types';
import {
  DEFAULT_NOTIFICATION_PREFS,
  buildCategoryPayload,
  categoryOfKey,
  mergeCategoryFrom,
  normalizeServerPreferences,
  togglePrefKey,
} from '../utils/notificationPrefs';

export { DEFAULT_NOTIFICATION_PREFS } from '../utils/notificationPrefs';

const storage = createMMKV({ id: 'tasklync_settings_storage' });
const PREFS_STORAGE_KEY = 'notification_preferences_cache';
const PREFS_QUERY_KEY = ['notification-preferences'];
/** Rapid taps on the same category collapse into one request carrying the final state. */
const SAVE_DEBOUNCE_MS = 350;

const readCache = (): NotificationPreferences => {
  try {
    const cached = storage.getString(PREFS_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_e) {}
  return DEFAULT_NOTIFICATION_PREFS;
};
const writeCache = (p: NotificationPreferences) => {
  try {
    storage.set(PREFS_STORAGE_KEY, JSON.stringify(p));
  } catch (_e) {}
};

/**
 * Per-category notification preferences (server: GET/PUT /notifications/preferences).
 * These are the customer's category choices; the OS push permission is separate and untouched.
 *
 * - Cached prefs render instantly (no flicker); the server copy is always revalidated on open.
 * - Each toggle updates the UI immediately (optimistic) and saves its category on its own timer,
 *   so toggling Booking then Chat quickly saves BOTH.
 * - Booking push and Booking SMS live in one server record: the payload is built from the latest
 *   UI state at send time, so one never overwrites the other.
 * - A failed save reverts that category to the last server-confirmed state and says so.
 * - Pending saves are flushed when the screen unmounts (navigating away never drops a change).
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  /** Last server-confirmed raw records, by category (also carries email/sms values the UI doesn't edit). */
  const serverRef = useRef<Map<NotificationCategory, CategoryPreference>>(new Map());
  /** Last server-confirmed UI-level state: what a failed save reverts to. */
  const confirmedRef = useRef<NotificationPreferences | null>(null);
  const timersRef = useRef<Map<NotificationCategory, ReturnType<typeof setTimeout>>>(new Map());
  /** UI state just before the first unsaved tap per category: revert target if the server was never reached. */
  const beforeEditRef = useRef<Map<NotificationCategory, NotificationPreferences>>(new Map());

  const { data: preferences = readCache(), isLoading } = useQuery<NotificationPreferences>({
    queryKey: PREFS_QUERY_KEY,
    queryFn: async () => {
      const rawList = await notificationApi.getPreferences();
      if (Array.isArray(rawList) && rawList.length > 0) {
        serverRef.current = new Map(rawList.map((p) => [p.category, p]));
        const normalized = normalizeServerPreferences(rawList);
        confirmedRef.current = normalized;
        // A save still waiting to be sent must not be visually undone by this refresh.
        const current = queryClient.getQueryData<NotificationPreferences>(PREFS_QUERY_KEY);
        let merged = normalized;
        if (current) {
          for (const cat of timersRef.current.keys()) merged = mergeCategoryFrom(merged, current, cat);
        }
        writeCache(merged);
        return merged;
      }
      // Offline / error: keep showing the cached state.
      return readCache();
    },
    initialData: readCache,
    // Cached data is shown instantly but is never treated as fresh: always revalidate on open.
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
  });

  const save = useCallback(
    async (category: NotificationCategory) => {
      timersRef.current.delete(category);
      const beforeEdit = beforeEditRef.current.get(category);
      beforeEditRef.current.delete(category);

      // Never guess the fields this screen doesn't edit (email, chat/marketing SMS): if the server
      // record isn't known yet (tap before the first load, or a fresh-cache reopen), load it first.
      if (!serverRef.current.has(category)) {
        const rawList = await notificationApi.getPreferences();
        for (const p of rawList) {
          if (!serverRef.current.has(p.category)) serverRef.current.set(p.category, p);
        }
        if (!confirmedRef.current && rawList.length > 0) confirmedRef.current = normalizeServerPreferences(rawList);
      }

      const latest = queryClient.getQueryData<NotificationPreferences>(PREFS_QUERY_KEY) ?? readCache();
      const payload = buildCategoryPayload(latest, category, serverRef.current.get(category));

      // Toggled back to what the server already has: nothing to send.
      const server = serverRef.current.get(category);
      if (
        server &&
        server.push_enabled === payload.push_enabled &&
        server.sms_enabled === payload.sms_enabled &&
        server.email_enabled === payload.email_enabled
      ) {
        return;
      }

      const result = await notificationApi.updatePreference(payload);
      if (result) {
        serverRef.current.set(category, { ...payload, ...result, category });
        confirmedRef.current = mergeCategoryFrom(confirmedRef.current ?? latest, latest, category);
        return;
      }

      // notificationApi.updatePreference returns null on any failure.
      if (timersRef.current.has(category)) return; // a newer tap is already queued; it will retry
      const fallback = confirmedRef.current ?? beforeEdit;
      if (fallback) {
        const current = queryClient.getQueryData<NotificationPreferences>(PREFS_QUERY_KEY) ?? latest;
        const reverted = mergeCategoryFrom(current, fallback, category);
        queryClient.setQueryData(PREFS_QUERY_KEY, reverted);
        writeCache(reverted);
      }
      useUIStore.getState().showToast({
        type: 'error',
        title: "Couldn't update notification settings. Check your connection and try again.",
      });
    },
    [queryClient]
  );

  const togglePreference = useCallback(
    (key: NotificationPrefKey) => {
      const current = queryClient.getQueryData<NotificationPreferences>(PREFS_QUERY_KEY) ?? readCache();
      const next = togglePrefKey(current, key);
      queryClient.setQueryData(PREFS_QUERY_KEY, next);
      writeCache(next);

      const category = categoryOfKey(key);
      if (!beforeEditRef.current.has(category)) beforeEditRef.current.set(category, current);
      const pending = timersRef.current.get(category);
      if (pending) clearTimeout(pending);
      timersRef.current.set(
        category,
        setTimeout(() => void save(category), SAVE_DEBOUNCE_MS)
      );
    },
    [queryClient, save]
  );

  // Leaving the screen inside the debounce window: send what is pending right away.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const [category, t] of timers) {
        clearTimeout(t);
        void save(category);
      }
    };
  }, [save]);

  return {
    preferences,
    isLoading,
    togglePreference,
  };
}
