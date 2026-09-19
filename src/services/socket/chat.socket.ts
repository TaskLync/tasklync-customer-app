import { socketService } from './socket.service';

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
