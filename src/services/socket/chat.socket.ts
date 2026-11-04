import { socketService } from './socket.service';
import type { AckResult } from '../../utils/messageSender';

export interface SendMessageSocketPayload {
  bookingId: string;
  roomId?: string | undefined;
  type: 'text' | 'image' | 'location';
  content: string;
  mediaUrl?: string | undefined;
  metadata?: Record<string, any> | undefined;
  tempId?: string | undefined;
}

/**
 * chatSocket — thin, spec-compliant wrapper around the singleton socketService.
 *
 * Changes vs. previous version:
 *  - Removed duplicate chat:* event emissions. The server spec defines only
 *    canonical event names (join_room, leave_room, send_message, typing_start,
 *    typing_stop, heartbeat). Emitting chat:join_room etc. in addition caused
 *    the server to receive double events and may have triggered validation
 *    errors (400) from unexpected event names.
 */
export const chatSocket = {
  /**
   * 3.2.3 (acknowledged) — Send a message and wait for the server to confirm it is STORED. Resolves with the
   * ack, or `{ ok:false, retryable:true }` when the socket is down or the ack is late. Does not queue and
   * does not drop silently (unlike `sendMessage`). Used with utils/messageSender.ts, which retries with the
   * same tempId so the backend can dedupe.
   */
  sendMessageWithAck: async (payload: SendMessageSocketPayload): Promise<AckResult> => {
    try {
      return await socketService.emitWithAck<AckResult>('send_message', payload);
    } catch (err) {
      const offline = (err as Error)?.message === 'OFFLINE';
      return { ok: false, code: offline ? 'OFFLINE' : 'ACK_TIMEOUT', retryable: true };
    }
  },

  isConnected: () => socketService.isConnected(),
  waitForConnection: (timeoutMs: number) => socketService.waitForConnection(timeoutMs),

  /** 3.2.1 — Join the room channel for a booking or persistent room. */
  joinRoom: (bookingId: string, roomId?: string) => {
    socketService.emit('join_room', { bookingId, ...(roomId ? { roomId } : {}) });
  },

  /** 3.2.2 — Leave the room channel when the user navigates away. */
  leaveRoom: (bookingId: string, roomId?: string) => {
    socketService.emit('leave_room', { bookingId, ...(roomId ? { roomId } : {}) });
  },

  /** 3.2.3 — Send a message (text / image / location). */
  sendMessage: (payload: SendMessageSocketPayload) => {
    socketService.emit('send_message', payload);
  },

  /** 3.2.4 — Notify server that the customer started typing. */
  startTyping: (bookingId: string) => {
    socketService.emit('typing_start', { bookingId });
  },

  /** 3.2.4 — Notify server that the customer stopped typing. */
  stopTyping: (bookingId: string) => {
    socketService.emit('typing_stop', { bookingId });
  },

  /**
   * 3.2.5 — Heartbeat to maintain Redis presence TTL.
   * Called every 30s from useChat while the room is mounted.
   */
  sendHeartbeat: () => {
    socketService.emit('heartbeat');
  },
};
