/**
 * Who sent an incoming chat event, decided from the payload alone. Pure (no React / RN imports) so it is unit
 * tested in __tests__/chat/chatSenderRules.test.ts. Drives the incoming chime in useChat.
 */
export interface IncomingSenderInput {
  senderType?: string | null | undefined;
  senderId?: string | null | undefined;
  messageType?: string | null | undefined;
  /** tempId echoed back by the server, if any. */
  echoedTempId?: string | null | undefined;
  /** The signed-in customer's id; the 'current-user' placeholder (auth not hydrated) counts as unknown. */
  currentUserId?: string | null | undefined;
  /** tempIds this device created; only these prove the echo is ours (the worker app sends tempIds too). */
  ownTempIds: ReadonlySet<string>;
}

export interface IncomingSender {
  isOwn: boolean;
  isSystem: boolean;
  /** From the worker / agency: the only case that gets the incoming chime. */
  isCounterparty: boolean;
}

const PLACEHOLDER_USER_ID = 'current-user';

export function classifyIncomingSender(input: IncomingSenderInput): IncomingSender {
  const type = String(input.senderType ?? '').toLowerCase();
  const userId =
    input.currentUserId && input.currentUserId !== PLACEHOLDER_USER_ID ? String(input.currentUserId) : null;

  const isOwn =
    (Boolean(input.echoedTempId) && input.ownTempIds.has(String(input.echoedTempId))) ||
    type === 'user' ||
    type === 'customer' ||
    (userId !== null && Boolean(input.senderId) && String(input.senderId) === userId);

  const isSystem = type === 'system' || input.messageType === 'system';

  return { isOwn, isSystem, isCounterparty: !isOwn && !isSystem };
}
