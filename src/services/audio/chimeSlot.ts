/**
 * One reusable chat chime: owns its player, serializes plays, and recovers from a broken player.
 *
 * Pure TypeScript (no expo / react-native imports) so it can be unit tested; the player is created through an
 * injected factory. chatSound.service.ts wires it to expo-audio.
 *
 * Why it exists
 * -------------
 * A chime must be replayable an unlimited number of times. In expo-audio a finished player rests at the END of the
 * clip, `seekTo()` is asynchronous (Promise<void>) and `play()` on a player that is still at the end does nothing.
 * The previous code awaited the seek, but:
 *   - the await had NO timeout. A seek that never settles wedged the service-level queue for good, so every later
 *     chime was silent ("works once, then never");
 *   - nothing checked that the player actually started, so a play that was silently ignored was never retried.
 *
 * Behaviour
 * ---------
 *  - one long-lived player, created on first use (no per-message creation);
 *  - every play waits for the rewind to finish, but only up to SEEK_TIMEOUT_MS;
 *  - plays are serialized; a burst collapses into one extra restart;
 *  - a player that throws (released / invalid native object) is replaced once and the chime retried;
 *  - self-check VERIFY_AFTER_MS after play(): if the player is not `playing` it is replaced and played once more,
 *    whatever the cause. A late check (busy JS thread) never replaces a healthy player whose clip already finished;
 *  - nothing here ever throws to the caller.
 */

export interface ChimePlayer {
  volume: number;
  readonly playing: boolean;
  readonly duration: number; // seconds
  readonly isLoaded: boolean;
  seekTo(seconds: number): Promise<void>;
  play(): void;
  remove(): void;
}

/** Slower than this and a seek is treated as "not coming" (a seek to the start of a short clip takes a few ms). */
export const SEEK_TIMEOUT_MS = 300;
/** The chimes are seconds long and load from the app bundle, so a started play reports `playing` well within this. */
export const VERIFY_AFTER_MS = 150;

/** Resolves when `promise` settles or after `ms`, whichever is first. Never rejects, leaves no timer behind. */
async function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
  } catch {
    // a rejected seek is handled by the caller's next step (play / recovery), not here
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Duration in seconds, or 0 when unknown / the native player is gone (reading a released player throws). */
function readDuration(player: ChimePlayer): number {
  try {
    const d = player.duration;
    return typeof d === 'number' && Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

export class ChimeSlot {
  private player: ChimePlayer | null = null;
  private playing = false; // a play is between "requested" and "play() called"
  private restartRequested = false;
  private latestVolume = 1;
  private lastPlayStartedAt = 0;
  private generation = 0; // bumped by every play so a stale self-check knows it was superseded
  private verifyTimer: ReturnType<typeof setTimeout> | null = null;

  // Plain fields (not constructor parameter properties): the unit tests run through Node's strip-only TypeScript mode
  private readonly label: string;
  private readonly createPlayer: () => ChimePlayer;
  private readonly verifyAfterMs: number;
  private readonly warn: (message: string, error?: unknown) => void;

  constructor(
    label: string,
    createPlayer: () => ChimePlayer,
    verifyAfterMs: number = VERIFY_AFTER_MS,
    warn: (message: string, error?: unknown) => void = () => undefined
  ) {
    this.label = label;
    this.createPlayer = createPlayer;
    this.verifyAfterMs = verifyAfterMs;
    this.warn = warn;
  }

  /** Creates the player if there is none. Safe to call repeatedly. */
  public warmUp(volume: number): void {
    this.latestVolume = volume;
    if (!this.player) this.create(volume);
  }

  public async play(volume: number): Promise<void> {
    this.latestVolume = volume;

    if (this.playing) {
      // A restart is already in flight: remember that another one is wanted. A burst of N calls becomes at most
      // one extra restart, never N overlapping seek/play pairs.
      this.restartRequested = true;
      return;
    }

    this.playing = true;
    try {
      do {
        this.restartRequested = false;
        await this.playOnce(this.latestVolume);
      } while (this.restartRequested);
    } finally {
      this.playing = false;
    }
  }

  public dispose(): void {
    if (this.verifyTimer) {
      clearTimeout(this.verifyTimer);
      this.verifyTimer = null;
    }
    this.generation += 1;
    this.discard();
    this.restartRequested = false;
  }

  private create(volume: number): ChimePlayer | null {
    try {
      const player = this.createPlayer();
      player.volume = volume;
      this.player = player;
      return player;
    } catch (err) {
      this.warn(`${this.label}: could not create player`, err);
      this.player = null;
      return null;
    }
  }

  private discard(): void {
    const old = this.player;
    this.player = null;
    if (!old) return;
    try {
      old.remove();
    } catch {
      // already released
    }
  }

  private async playOnce(volume: number): Promise<void> {
    const player = this.player ?? this.create(volume);
    if (!player) return;

    try {
      await this.restartAndPlay(player, volume);
      return;
    } catch (err) {
      this.warn(`${this.label}: playback failed, recreating the player`, err);
    }

    // Recovery: the player was released / invalidated. Replace it once and retry; never loop.
    this.discard();
    const fresh = this.create(volume);
    if (!fresh) return;
    try {
      fresh.play();
    } catch (err) {
      this.warn(`${this.label}: retry failed`, err);
      this.discard();
    }
  }

  private async restartAndPlay(player: ChimePlayer, volume: number): Promise<void> {
    // A finished player rests at the end: wait until the rewind has really happened before play().
    // `isLoaded` alone is NOT a usable test: on Android expo-audio reports it as `playbackState == STATE_READY`,
    // and a clip that has finished is in STATE_ENDED, so a loaded player at the end reads isLoaded=false. Gating
    // the rewind on it skipped the seek after every chime, play() was a no-op and each chime fell through to the
    // rebuild path. A player that has ever loaded knows its duration (also in STATE_ENDED), so that is the test.
    // (A player still loading has duration 0 and nothing to rewind; play() starts it once it is ready.)
    if (player.isLoaded || readDuration(player) > 0) {
      await settleWithin(player.seekTo(0), SEEK_TIMEOUT_MS);
    }
    // dispose() or a rebuild may have run while we waited: do not touch a player that is no longer ours
    if (this.player !== player) return;
    player.volume = volume;
    this.lastPlayStartedAt = Date.now();
    player.play();
    this.scheduleVerification(player, volume);
  }

  private scheduleVerification(player: ChimePlayer, volume: number): void {
    if (this.verifyTimer) clearTimeout(this.verifyTimer);
    const generation = ++this.generation;

    this.verifyTimer = setTimeout(() => {
      this.verifyTimer = null;
      if (generation !== this.generation || this.player !== player) return; // superseded / disposed

      let isPlaying = true;
      let durationSeconds = 0;
      try {
        isPlaying = player.playing;
        durationSeconds = player.duration;
      } catch {
        isPlaying = false; // reading a released player throws
      }
      if (isPlaying) return;

      // A late check: if the whole clip has had time to play, "not playing" just means it finished.
      const elapsedMs = Date.now() - this.lastPlayStartedAt;
      if (durationSeconds > 0 && elapsedMs >= durationSeconds * 1000) return;

      this.warn(`${this.label}: chime did not start, recreating the player`);
      this.discard();
      const fresh = this.create(volume);
      if (!fresh) return;
      try {
        fresh.play();
      } catch (err) {
        this.warn(`${this.label}: retry failed`, err);
        this.discard();
      }
    }, this.verifyAfterMs);
  }
}
