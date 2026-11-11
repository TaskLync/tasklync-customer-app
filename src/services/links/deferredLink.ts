import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import { createMMKV } from 'react-native-mmkv';
import { notificationQueue } from '../notifications/notification-queue';
import { parsePlayInstallReferrer, parseShareLink, routeFor } from '../../utils/shareLinks';

/**
 * Deferred deep linking, self-built (no third-party SDK). Runs ONCE per install, on first launch:
 *
 *  - Android: the web fallback page sends users to Google Play with `&referrer=link%3D%2Fworker%2F<id>`.
 *    The Play Install Referrer API hands that string back after install. Exact and reliable.
 *  - iOS: the web fallback page copies the share URL to the clipboard before opening the App Store.
 *    On first launch we look for an https URL of ours. `hasUrlAsync` does not trigger the iOS paste
 *    banner; the URL is only read when one is present, strictly validated and cleared if it was ours.
 *    Best effort by nature (the user can overwrite the clipboard before first launch).
 *
 * The destination is delivered through the same queue as push-notification taps, so sign-in
 * (a brand-new user must register first) is handled by the existing flow.
 */
const storage = createMMKV({ id: 'tasklync_deferred_link' });
const DONE_KEY = 'first_launch_resolved';

export async function resolveDeferredLink(): Promise<void> {
  if (storage.getBoolean(DONE_KEY)) return;
  // Mark first: a crash or timeout must never cause the same link to be replayed on a later launch.
  storage.set(DONE_KEY, true);

  try {
    let target = null;
    if (Platform.OS === 'android') {
      const referrer = await Application.getInstallReferrerAsync();
      target = parsePlayInstallReferrer(referrer);
    } else if (Platform.OS === 'ios') {
      if (await Clipboard.hasUrlAsync()) {
        const url = await Clipboard.getUrlAsync();
        target = parseShareLink(url);
        if (target) await Clipboard.setStringAsync('');
      }
    }
    if (target) notificationQueue.enqueue(routeFor(target));
  } catch {
    // No referrer service / clipboard unavailable: the user simply lands on Home.
  }
}
