/**
 * Holds notification-tap destinations until the signed-in app shell (the tabs layout) is mounted.
 *
 * Every tap (cold start, background, foreground) goes through enqueue():
 *  - tabs layout mounted (= navigation tree ready AND user signed in) -> navigates immediately
 *  - otherwise (cold start, still on splash/auth) -> waits, and is delivered when the consumer attaches
 * Duplicate deliveries of the same notification (getLastNotificationResponse + response listener) are dropped.
 */
const MAX_AGE_MS = 15 * 60 * 1000;
const SEEN_LIMIT = 50;

interface Pending {
  path: string;
  at: number;
}

class NotificationQueue {
  private pending: Pending | null = null;
  private consumer: ((path: string) => void) | null = null;
  private seen: string[] = [];

  /** @param notificationId request identifier of the tapped notification, used to drop duplicate deliveries */
  enqueue(path: string, notificationId?: string): void {
    if (!path || !path.trim()) return;
    if (notificationId) {
      if (this.seen.includes(notificationId)) return;
      this.seen.push(notificationId);
      if (this.seen.length > SEEN_LIMIT) this.seen.shift();
    }
    // Only the latest tap matters: older taps made while the app was not ready are superseded.
    this.pending = { path, at: Date.now() };
    this.deliver();
  }

  /** Called by the tabs layout when it mounts. Returns the detach function for the effect cleanup. */
  attachConsumer(fn: (path: string) => void): () => void {
    this.consumer = fn;
    this.deliver();
    return () => {
      if (this.consumer === fn) this.consumer = null;
    };
  }

  private deliver(): void {
    if (!this.pending || !this.consumer) return;
    const { path, at } = this.pending;
    this.pending = null;
    if (Date.now() - at > MAX_AGE_MS) return;
    const fn = this.consumer;
    // let the tab tree finish its first layout before stacking a screen on top of it
    setTimeout(() => fn(path), 50);
  }

  hasPending(): boolean {
    return this.pending !== null;
  }

  clear(): void {
    this.pending = null;
  }
}

export const notificationQueue = new NotificationQueue();
