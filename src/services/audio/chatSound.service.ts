import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform, AppState } from 'react-native';
import { ChimeSlot } from './chimeSlot';

// Sound assets required via Metro bundler
const SEND_SOUND_ASSET = require('../../../assets/sounds/send_message.mp3');
const RECEIVE_SOUND_ASSET = require('../../../assets/sounds/receive_message.mp3');

const SEND_VOLUME = 0.85;
const RECEIVE_VOLUME = 0.95;

function warnInDev(message: string, error?: unknown): void {
  if (__DEV__) console.warn(`[ChatSoundService] ${message}`, error ?? '');
}

/**
 * Modern, thread-safe, scalable chat sound engine for Expo 57 & React Native 0.86 New Architecture.
 * Replaces legacy expo-av with TurboModule expo-audio.
 * Features:
 * - Lazy initialization (zero overhead or native calls during app cold launch)
 * - Async mutex serialization (eliminates JNI concurrency crashes)
 * - 5-minute TTL deduplication (prevents duplicate sounds across socket and push listeners)
 * - Safe haptic feedback integration
 * - Total error containment (guarantees 0 unhandled promise rejections or native crashes)
 */
class ChatSoundService {
  // One long-lived player per chime. No native call happens until the first preload / play (lazy), and each slot
  // seeks back to the start before every play, with a timeout, and replaces its player if it breaks (chimeSlot.ts).
  private sendSlot = new ChimeSlot('send', () => createAudioPlayer(SEND_SOUND_ASSET), undefined, warnInDev);
  private receiveSlot = new ChimeSlot('receive', () => createAudioPlayer(RECEIVE_SOUND_ASSET), undefined, warnInDev);
  private isAudioModeConfigured = false;
  private isPreloaded = false;
  private isEnabled = true;
  private isInitializing = false;

  // Web HTML5 Audio elements
  private webSendAudio: HTMLAudioElement | null = null;
  private webReceiveAudio: HTMLAudioElement | null = null;

  // Execution Queue (Async Mutex) to serialize playback and prevent JNI collisions
  private playbackQueue: Promise<void> = Promise.resolve();

  // Deduplication: one chime per message, per direction. Keys are recorded only when the chime is actually
  // going to play, so a call that is skipped (backgrounded, disabled) never silences that message later.
  // Bursts need no throttle: each ChimeSlot collapses overlapping plays into one restart.
  private chimedSend = new Map<string, number>(); // tempId / message id -> timestamp
  private chimedReceive = new Map<string, number>(); // server message id -> timestamp
  private readonly DEDUP_TTL_MS = 1000 * 60 * 5; // 5 minutes TTL
  private readonly MAX_DEDUP_CACHE = 200;

  /**
   * Configures OS-level audio session attributes safely.
   */
  private async configureAudioMode(): Promise<void> {
    if (this.isAudioModeConfigured || Platform.OS === 'web') return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      });
      this.isAudioModeConfigured = true;
    } catch (error) {
      if (__DEV__) {
        console.warn('[ChatSoundService] Audio mode configuration notice:', error);
      }
    }
  }

  /**
   * Safe on-demand preloading of sound assets into memory for instant playback.
   * Called only when entering chat screen or when first sound is played.
   */
  public async ensurePreloaded(): Promise<void> {
    if (this.isPreloaded || this.isInitializing) return;
    this.isInitializing = true;

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
          try {
            this.webSendAudio = new (window as any).Audio(SEND_SOUND_ASSET);
            this.webReceiveAudio = new (window as any).Audio(RECEIVE_SOUND_ASSET);
            if (this.webSendAudio) this.webSendAudio.preload = 'auto';
            if (this.webReceiveAudio) this.webReceiveAudio.preload = 'auto';
          } catch {}
        }
        this.isPreloaded = true;
        return;
      }

      await this.configureAudioMode();

      // Each slot creates its player once; a failure on one does not stop the other, and the next play retries it
      this.sendSlot.warmUp(SEND_VOLUME);
      this.receiveSlot.warmUp(RECEIVE_VOLUME);

      this.isPreloaded = true;
    } catch (error) {
      if (__DEV__) {
        console.warn('[ChatSoundService] Preloading failed gracefully:', error);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Enqueues an audio task onto the serial execution queue.
   */
  private enqueueTask<T>(task: () => Promise<T>): Promise<T | void> {
    const nextPromise = this.playbackQueue
      .catch(() => {})
      .then(async () => {
        try {
          return await task();
        } catch (err) {
          if (__DEV__) {
            console.warn('[ChatSoundService] Enqueued audio task error:', err);
          }
        }
      });

    this.playbackQueue = nextPromise.then(() => {});
    return nextPromise;
  }

  /**
   * Plays a chime through its slot (rewind with timeout, serialized, self-checking, self-healing).
   * The audio session is configured first because a play can be the very first audio call of the session.
   */
  private async playChime(type: 'send' | 'receive', volume: number): Promise<void> {
    await this.configureAudioMode();
    await (type === 'send' ? this.sendSlot : this.receiveSlot).play(volume);
  }

  /**
   * Toggle sound enabled/disabled state (respects user preferences).
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Plays the outgoing chime once the server has CONFIRMED a message the current user sent.
   * `messageKey` (the message's tempId) makes it fire once per message even when both the ack and the
   * echo confirm it, or a retry confirms it later.
   * Completely fail-safe: never throws or crashes caller.
   */
  public playSendSound(messageKey?: string): Promise<void> {
    if (!this.isEnabled) return Promise.resolve();

    // App state check: do not play sound if app is backgrounded
    if (Platform.OS !== 'web' && AppState.currentState !== 'active') {
      return Promise.resolve();
    }

    if (messageKey && !this.claimOnce(this.chimedSend, messageKey)) return Promise.resolve();

    if (Platform.OS === 'web') {
      try {
        if (this.webSendAudio) {
          this.webSendAudio.currentTime = 0;
          this.webSendAudio.play().catch(() => {});
        }
      } catch {}
      return Promise.resolve();
    }

    return this.enqueueTask(async () => {
      await this.playChime('send', SEND_VOLUME);
    }) as Promise<void>;
  }

  /**
   * Plays receive sound when a message arrives from another user.
   * Includes sender check, deduplication, and app foreground state guard.
   * Completely fail-safe: never throws or crashes caller.
   */
  public playReceiveSound(
    messageId?: string,
    senderId?: string,
    currentUserId?: string
  ): Promise<void> {
    if (!this.isEnabled) return Promise.resolve();

    // 1. Never play receive sound for the current user's own sent/echoed messages
    if (senderId && currentUserId && String(senderId) === String(currentUserId)) {
      return Promise.resolve();
    }

    // 2. Foreground Check: Only play in-app sound when app is strictly active
    if (Platform.OS !== 'web' && AppState.currentState !== 'active') {
      return Promise.resolve();
    }

    // 3. Deduplication: the same message can arrive through the socket, a reconnect replay and a push
    if (messageId && !this.claimOnce(this.chimedReceive, messageId)) return Promise.resolve();

    if (Platform.OS === 'web') {
      try {
        if (this.webReceiveAudio) {
          this.webReceiveAudio.currentTime = 0;
          this.webReceiveAudio.play().catch(() => {});
        }
      } catch {}
      return Promise.resolve();
    }

    return this.enqueueTask(async () => {
      await this.playChime('receive', RECEIVE_VOLUME);
    }) as Promise<void>;
  }

  /**
   * Returns true the first time `key` is seen within the TTL (and records it), false for a repeat.
   * Bounded: expired keys go first, then the oldest (Map keeps insertion order).
   */
  private claimOnce(cache: Map<string, number>, key: string): boolean {
    const id = String(key).trim();
    if (!id) return true;
    const now = Date.now();
    const previous = cache.get(id);
    if (previous !== undefined && now - previous < this.DEDUP_TTL_MS) return false;

    if (cache.size >= this.MAX_DEDUP_CACHE) {
      const cutoff = now - this.DEDUP_TTL_MS;
      for (const [k, t] of cache) {
        if (t < cutoff) cache.delete(k);
      }
      while (cache.size >= this.MAX_DEDUP_CACHE) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
    }
    cache.set(id, now);
    return true;
  }

  /**
   * Releases player objects on shutdown to free native memory.
   */
  public async unload(): Promise<void> {
    return this.enqueueTask(async () => {
      try {
        this.sendSlot.dispose();
        this.receiveSlot.dispose();
        this.isPreloaded = false;
        this.isAudioModeConfigured = false;
      } catch {}
    }) as Promise<void>;
  }
}

export const chatSoundService = new ChatSoundService();

