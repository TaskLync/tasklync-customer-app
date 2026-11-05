/**
 * Shared reading of chat push payloads, so the foreground presentation handler (push.service.ts) and the
 * foreground listener (NotificationProvider) agree on which sound a chat push gets while the app is open:
 *
 *   - chat push WITH a message id  -> the in-app incoming chime (deduplicated by id against the socket event
 *                                     for the same message), and the OS notification sound is suppressed;
 *   - chat push WITHOUT a message id -> the OS notification sound only (an id-less chime could not be
 *                                     deduplicated and would double up with the socket chime).
 *
 * Background / killed: the OS plays the notification channel's sound; nothing here runs.
 */
type PushData = Record<string, unknown> | null | undefined;

export function isChatPush(data: PushData): boolean {
  if (!data) return false;
  const category = String(data.type ?? data.category ?? '').toLowerCase();
  return category.includes('chat') || category.includes('message');
}

/** The server message id carried by a chat push, or undefined when the payload has none. */
export function getChatPushMessageId(data: PushData): string | undefined {
  if (!data) return undefined;
  const raw = data.message_id ?? data.messageId;
  const id = raw === undefined || raw === null ? '' : String(raw).trim();
  return id || undefined;
}

/** True when the in-app chime will play for this push, so the OS sound must stay silent. */
export function chimeHandlesChatPush(data: PushData): boolean {
  return isChatPush(data) && Boolean(getChatPushMessageId(data));
}
