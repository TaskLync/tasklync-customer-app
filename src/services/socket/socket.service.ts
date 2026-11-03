import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../config/socket.config';
import { useSocketStore } from '../../store/socket.store';

class SocketService {
  private socket: Socket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Token used for the current socket instance — avoids redundant reconnects */
  private currentToken: string | null = null;
  /** Persisted event listeners to survive socket creation and reconnection */
  private listeners = new Map<string, Set<(payload: any) => void>>();

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Connects to the Socket.IO chat gateway.
   *
   * Key decisions vs. the previous implementation:
   *   1. transports: ['websocket'] ONLY — polling caused the cascade of
   *      400 Bad Requests seen in the logs. Socket.IO EIO=4 polling requires
   *      the server to also support polling; if it doesn't (or the proxy
   *      strips the body), every POST returns 400 immediately, the client
   *      retries infinitely, and the session-id (sid) keeps cycling.
   *      Forcing 'websocket' from the start skips the HTTP upgrade dance.
   *   2. auth.token is the canonical Socket.IO v4 handshake mechanism; we
   *      keep query.token only as a compatibility fallback for proxies that
   *      strip WS upgrade headers.
   *   3. Built-in Socket.IO reconnection is DISABLED because we already
   *      implement our own exponential-backoff reconnect (scheduleReconnect).
   *      Running both created double-reconnect storms.
   *   4. We guard against re-connecting with the same token to prevent the
   *      "NetInfo fires → connect called again while already connected" race.
   */
  public connect(token: string): void {
    // Already connected with the same credentials — nothing to do.
    if (this.socket?.connected && this.currentToken === token) return;

    this.currentToken = token;
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(SOCKET_CONFIG.SOCKET_URL, {
      path: '/chat',

      // ✅ websocket ONLY — eliminates the 400 polling loop
      transports: ['websocket'],

      // Canonical Socket.IO v4 auth handshake
      auth: { token },
      // Fallback for aggressive reverse-proxies / Cloudflare workers
      query: { token },

      // Let our own scheduleReconnect() handle reconnection
      reconnection: false,

      // How long to wait for the WS upgrade to succeed
      timeout: 20000,
    });

    this.attachInternalListeners();

    // Re-attach all registered listeners to the new socket instance
    this.listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket?.on(event, handler);
      });
    });
  }

  /**
   * Updates the socket auth token after a session token refresh without breaking active connections.
   */
  public updateToken(token: string): void {
    if (this.currentToken === token) return;
    this.currentToken = token;
    if (this.socket) {
      if ((this.socket as any).auth) {
        (this.socket as any).auth = { token };
      }
      if (this.socket.io?.opts) {
        (this.socket.io.opts as any).auth = { token };
        (this.socket.io.opts as any).query = { token };
      }
      // If the socket was disconnected due to expired token, reconnect immediately with new token
      if (!this.socket.connected) {
        this.clearTimers();
        this.socket.connect();
      }
    }
  }

  /**
   * Gracefully disconnects and resets all internal state.
   */
  public disconnect(): void {
    this.clearTimers();
    this.currentToken = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    useSocketStore.getState().setDisconnected();
  }

  /**
   * Safe emit — drops events silently when the socket is not connected
   * and logs a warning so developers can catch issues in dev builds.
   */
  public emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn(`[SocketService] Dropped event '${event}' — socket disconnected`);
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Subscribes to a server event.
   * Returns an unsubscribe function for easy cleanup.
   */
  public on(event: string, handler: (payload: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribes a specific event handler.
   */
  public off(event: string, handler: (payload: any) => void): void {
    this.listeners.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  // ─── Internal lifecycle ─────────────────────────────────────────────────────

  private attachInternalListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.clearTimers();
      useSocketStore.getState().setConnected();
      this.startHeartbeat();
      console.log('[SocketService] Connected —', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[SocketService] Disconnected —', reason);
      this.clearTimers();
      useSocketStore.getState().setDisconnected();

      // 'io client disconnect' → caller intentionally disconnected; do not reconnect.
      // 'io server disconnect' → server kicked us (auth error, etc.); do not loop.
      // Everything else (transport errors, network drops) → exponential backoff.
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketService] Connection error —', err.message);
      useSocketStore.getState().setDisconnected();
      // Do NOT reconnect on auth failures — the token needs to be refreshed first.
      // Server error: "WS_AUTH_FAILED: invalid or expired token"
      // jsonwebtoken errors: "jwt expired", "invalid signature", etc.
      const msg = err.message?.toLowerCase() ?? '';
      const isAuthError =
        msg.includes('ws_auth_failed') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden') ||
        msg.includes('jwt') ||
        msg.includes('token');
      if (!isAuthError) {
        this.scheduleReconnect();
      }
    });
  }

  /**
   * Sends a heartbeat ping every HEARTBEAT_INTERVAL_MS to maintain Redis
   * presence TTL on the server side.
   *
   * NOTE: We emit 'heartbeat' (the event the backend expects per the spec),
   * NOT the Socket.IO internal 'ping'. Socket.IO manages its own keep-alive
   * ping/pong at the protocol level; emitting 'ping' as an app event was
   * incorrect and caused "Unknown event" errors on some server configurations.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, SOCKET_CONFIG.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Exponential-backoff reconnect scheduler.
   * Uses the delay ladder defined in SOCKET_CONFIG.RECONNECT_DELAYS_MS.
   * Guards against scheduling multiple concurrent reconnect timers.
   */
  private scheduleReconnect(): void {
    // Already scheduled — do not stack multiple timers.
    if (this.reconnectTimeout) return;

    const { reconnectAttempts } = useSocketStore.getState();
    const delays = SOCKET_CONFIG.RECONNECT_DELAYS_MS;
    const baseDelay = delays[Math.min(reconnectAttempts, delays.length - 1)] ?? 1000;
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;

    useSocketStore.getState().incrementReconnectAttempt();

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      // Only reconnect if we still have a token and the socket is down.
      if (this.currentToken && this.socket && !this.socket.connected) {
        console.log(`[SocketService] Reconnecting (attempt ${reconnectAttempts + 1})…`);
        this.socket.connect();
      }
    }, delay);
  }

  private clearTimers(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

// Singleton — one socket connection for the entire app lifetime.
export const socketService = new SocketService();
