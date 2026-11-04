/**
 * Reliable chat send: ack-based, retried with exponential backoff + jitter, safe against duplicates.
 *
 * The rules this module enforces
 * ------------------------------
 *  - A message is only "sent" when the SERVER acknowledges it (it is stored, with a canonical id), or
 *    when the caller reports the echo of it (see `signal.settled`). Emitting on a socket is not "sent".
 *  - Every attempt of one message carries the SAME client id (`payload.tempId`). The backend stores at most
 *    one row per (sender, client id), so resending after a lost ack, a dropped socket or a delayed reply
 *    can never create a second message. Never mint a new id for a retry.
 *  - Only failures the server marks `retryable` (or a missing/late ack, or being offline) are retried.
 *    A validation error, a blocked chat or a closed room fails immediately.
 *
 * No React, no sockets: the transport and the clock are injected, so every branch is unit-tested.
 */

export interface SentMessage {
  id: string;
  createdAt?: string;
  roomId?: string;
  tempId?: string;
}

export type AckResult =
  | { ok: true; duplicate?: boolean; message?: SentMessage | null }
  | { ok: false; code: string; message?: string; retryable: boolean };

export interface SendTransport<P> {
  /** Emit once and resolve with the server's ack. Must reject / resolve ok:false on timeout. */
  emit(payload: P): Promise<AckResult>;
  isConnected(): boolean;
  /** Resolves true as soon as the socket is connected, false if `timeoutMs` passes first. */
  waitForConnection(timeoutMs: number): Promise<boolean>;
}

export interface RetryOptions {
  maxAttempts: number;
  /** Total time budget for the whole send, across every attempt and wait. */
  deadlineMs: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** How long to wait for a connection before an attempt counts as failed. */
  connectWaitMs: number;
  random: () => number;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 6,
  deadlineMs: 60_000,
  baseDelayMs: 800,
  maxDelayMs: 10_000,
  connectWaitMs: 8_000,
  random: Math.random,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

export type SendOutcome =
  | { status: 'sent'; message: SentMessage | null; duplicate: boolean; attempts: number }
  | { status: 'failed'; code: string; retryable: boolean; attempts: number }
  | { status: 'cancelled'; attempts: number };

/** Shared flag the caller flips when the message was confirmed another way (e.g. the echo arrived) or abandoned. */
export interface SendSignal {
  settled: boolean;
  cancelled: boolean;
}

/**
 * Exponential backoff with "equal jitter": half the delay is fixed, half is random. Spreads out a crowd
 * of apps that all lost the connection at the same moment, without ever retrying instantly.
 */
export function backoffDelay(attempt: number, o: Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs' | 'random'>): number {
  const exp = Math.min(o.maxDelayMs, o.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(exp / 2 + o.random() * (exp / 2));
}

export async function sendWithRetry<P>(
  payload: P,
  transport: SendTransport<P>,
  signal: SendSignal = { settled: false, cancelled: false },
  options: Partial<RetryOptions> = {}
): Promise<SendOutcome> {
  const o: RetryOptions = { ...DEFAULT_RETRY, ...options };
  const started = o.now();
  const remaining = () => o.deadlineMs - (o.now() - started);
  let attempts = 0;
  let last: { code: string; retryable: boolean } = { code: 'UNKNOWN', retryable: true };

  while (attempts < o.maxAttempts && remaining() > 0) {
    if (signal.settled) return { status: 'sent', message: null, duplicate: false, attempts };
    if (signal.cancelled) return { status: 'cancelled', attempts };

    // Nothing to emit on: wait for the socket instead of burning an attempt on a guaranteed failure
    if (!transport.isConnected()) {
      const connected = await transport.waitForConnection(Math.min(o.connectWaitMs, Math.max(remaining(), 0)));
      if (signal.settled) return { status: 'sent', message: null, duplicate: false, attempts };
      if (signal.cancelled) return { status: 'cancelled', attempts };
      if (!connected) {
        last = { code: 'OFFLINE', retryable: true };
        attempts += 1;
        continue;
      }
    }

    attempts += 1;
    let ack: AckResult;
    try {
      ack = await transport.emit(payload);
    } catch {
      // No ack in time: the message may or may not be stored. Resending is safe because it is idempotent.
      ack = { ok: false, code: 'ACK_TIMEOUT', retryable: true };
    }

    if (signal.settled) return { status: 'sent', message: null, duplicate: false, attempts };
    if (signal.cancelled) return { status: 'cancelled', attempts };

    if (ack.ok) {
      return { status: 'sent', message: ack.message ?? null, duplicate: ack.duplicate === true, attempts };
    }
    last = { code: ack.code, retryable: ack.retryable };
    if (!ack.retryable) return { status: 'failed', code: ack.code, retryable: false, attempts };

    if (attempts >= o.maxAttempts) break;
    const wait = Math.min(backoffDelay(attempts, o), Math.max(remaining(), 0));
    if (wait <= 0) break;
    await o.sleep(wait);
  }

  if (signal.settled) return { status: 'sent', message: null, duplicate: false, attempts };
  return { status: 'failed', code: last.code, retryable: true, attempts };
}
