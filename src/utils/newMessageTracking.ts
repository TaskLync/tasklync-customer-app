/**
 * Decides what a change in the message list means for scrolling / the "new messages" pill.
 *
 * The key point: only a change of the NEWEST message is a new arrival. Loading an older page grows
 * the array too, but leaves the newest message untouched and must neither scroll nor count as new.
 */
export interface TrackedMessage {
  id: string;
  temp_id?: string | undefined;
  sender_type?: string | undefined;
}

export type NewMessageAction =
  | { kind: 'none' }
  | { kind: 'scroll' }
  | { kind: 'unread'; count: number };

export function messageKey(m: TrackedMessage | undefined | null): string | null {
  if (!m) return null;
  return m.temp_id || m.id || null;
}

export function classifyMessageChange(args: {
  prevNewestKey: string | null;
  messages: TrackedMessage[];
  isAtBottom: boolean;
}): NewMessageAction {
  const { prevNewestKey, messages, isAtBottom } = args;
  const newest = messages[messages.length - 1];
  const key = messageKey(newest);

  if (!newest || !key || key === prevNewestKey) return { kind: 'none' };
  // First message(s) of an empty / just-loaded conversation: keep the view at the bottom, no pill.
  if (prevNewestKey === null) return { kind: 'scroll' };

  const prevIdx = messages.findIndex((m) => m.temp_id === prevNewestKey || m.id === prevNewestKey);
  const added = prevIdx >= 0 ? messages.length - 1 - prevIdx : 1;
  // Same message re-keyed (optimistic temp id replaced by the server id): nothing new arrived.
  if (added <= 0) return { kind: 'none' };

  const isOutgoing = newest.sender_type === 'user' || newest.sender_type === 'customer';
  if (isOutgoing || isAtBottom) return { kind: 'scroll' };
  return { kind: 'unread', count: added };
}
