import { useAuthStore } from '../src/store/auth.store';
import { notificationQueue } from '../src/services/notifications/notification-queue';
import { parseShareLink, routeFor, SHARE_HOST } from '../src/utils/shareLinks';

/**
 * Every URL the OS hands to the app (App Link, Universal Link, tasklync://) passes through here first.
 *
 *  - A valid share link to a signed-in, already-running app opens the exact profile directly.
 *  - A valid share link on cold start / signed-out is queued in the existing notification queue (delivered
 *    by the tabs shell once the user is signed in and navigation is ready) and the app starts at Home / login.
 *  - Our own host with an unknown or malformed path never reaches the router: it lands on Home, not on a 404.
 *  - Everything else (other tasklync:// routes, expo dev URLs) passes through untouched.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  const target = parseShareLink(path);

  if (target) {
    const route = routeFor(target);
    const signedIn = useAuthStore.getState().isAuthenticated;
    if (!initial && signedIn) return route;
    notificationQueue.enqueue(route);
    return '/';
  }

  if (/^https:\/\/(www\.)?/i.test(path) && path.toLowerCase().includes(SHARE_HOST)) {
    return '/';
  }
  return path;
}
