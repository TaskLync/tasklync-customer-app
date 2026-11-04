import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ChimeSlot, SEEK_TIMEOUT_MS } from '../../src/services/audio/chimeSlot.ts';
import type { ChimePlayer } from '../../src/services/audio/chimeSlot.ts';

/**
 * Tests against a FAKE player that models the hazard: a finished player rests at the end of the clip, seekTo() is
 * asynchronous, and play() on a player still at the end does nothing. It is a model, not the real device player.
 */
const CLIP_MS = 60;
const SEEK_MS = 5;
const VERIFY_MS = 20;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class FakePlayer implements ChimePlayer {
  static all: FakePlayer[] = [];
  static failNextCreate = false;

  volume = 1;
  isLoaded = true;
  duration = CLIP_MS / 1000; // seconds
  position = 0;
  removed = false;
  playCalls = 0;
  audible = 0;
  seekNeverSettles = false;
  throwOnPlay = false;
  stuck = false;
  private playingUntil = 0;

  constructor() {
    if (FakePlayer.failNextCreate) {
      FakePlayer.failNextCreate = false;
      throw new Error('native player could not be created');
    }
    FakePlayer.all.push(this);
  }

  get playing(): boolean {
    return Date.now() < this.playingUntil;
  }

  seekTo(seconds: number): Promise<void> {
    if (this.seekNeverSettles) return new Promise(() => undefined);
    return sleep(SEEK_MS).then(() => {
      if (this.removed) throw new Error('player released');
      this.position = seconds;
    });
  }

  play(): void {
    if (this.removed || this.throwOnPlay) {
      this.throwOnPlay = false;
      throw new Error('player released');
    }
    this.playCalls += 1;
    if (this.stuck) return;
    if (this.position >= this.duration) return; // still at the end: nothing happens (the hazard)
    this.audible += 1;
    this.playingUntil = Date.now() + CLIP_MS;
    setTimeout(() => {
      this.position = this.duration;
    }, CLIP_MS);
  }

  remove(): void {
    this.removed = true;
  }
}

const clipFinished = () => sleep(CLIP_MS + 20);
const slot = (verifyMs = VERIFY_MS) => new ChimeSlot('test', () => new FakePlayer(), verifyMs);

beforeEach(() => {
  FakePlayer.all = [];
  FakePlayer.failNextCreate = false;
});

describe('ChimeSlot: repeated playback', () => {
  test('control: seekTo without await then play silently drops chimes in this model', async () => {
    const player = new FakePlayer();
    for (let i = 0; i < 5; i++) {
      player.seekTo(0);
      player.play();
      await clipFinished();
    }
    assert.ok(player.audible < 5);
  });

  test('plays EVERY time, 12 consecutive messages', async () => {
    const s = slot();
    s.warmUp(1);
    for (let i = 0; i < 12; i++) {
      await s.play(1);
      await clipFinished();
    }
    assert.strictEqual(FakePlayer.all[0]?.audible, 12);
  });

  test('one player however many chimes (no churn)', async () => {
    const s = slot();
    for (let i = 0; i < 40; i++) await s.play(1);
    assert.strictEqual(FakePlayer.all.length, 1);
  });

  test('a rapid burst of 30 calls does not throw and the slot keeps working', async () => {
    const s = slot();
    await Promise.all(Array.from({ length: 30 }, () => s.play(1)));
    await clipFinished();
    await s.play(1);
    assert.strictEqual(FakePlayer.all.length, 1);
    assert.ok((FakePlayer.all[0]?.audible ?? 0) >= 2);
  });
});

describe('ChimeSlot: the queue can no longer be wedged', () => {
  test('a seek that never settles is abandoned after the timeout and the chime still plays', async () => {
    const s = slot();
    s.warmUp(1);
    FakePlayer.all[0]!.seekNeverSettles = true;
    const started = Date.now();
    await s.play(1);
    assert.ok(Date.now() - started >= SEEK_TIMEOUT_MS - 20, 'waited for the timeout');
    assert.strictEqual(FakePlayer.all[0]?.playCalls, 1);
  });

  test('a later chime still plays after a wedged seek (the old queue would stay blocked forever)', async () => {
    const s = slot();
    s.warmUp(1);
    FakePlayer.all[0]!.seekNeverSettles = true;
    await s.play(1);
    FakePlayer.all[0]!.seekNeverSettles = false;
    await clipFinished();
    await s.play(1);
    assert.ok((FakePlayer.all[0]?.playCalls ?? 0) >= 2);
  });
});

describe('ChimeSlot: self-check and recovery', () => {
  test('replaces a wedged player that accepts play() but stays silent, and the chime sounds', async () => {
    const s = slot();
    s.warmUp(1);
    FakePlayer.all[0]!.stuck = true;
    await s.play(1);
    await sleep(VERIFY_MS + 30);
    assert.strictEqual(FakePlayer.all.length, 2);
    assert.strictEqual(FakePlayer.all[0]?.removed, true);
    assert.strictEqual(FakePlayer.all[1]?.audible, 1);
  });

  test('does NOT recreate healthy players: 15 chimes, still one player', async () => {
    const s = slot();
    for (let i = 0; i < 15; i++) {
      await s.play(1);
      await sleep(VERIFY_MS + 5);
    }
    assert.strictEqual(FakePlayer.all.length, 1);
  });

  test('a LATE self-check never replaces a healthy player whose clip simply finished', async () => {
    const s = slot(CLIP_MS * 2);
    await s.play(1);
    await sleep(CLIP_MS * 2 + 40);
    assert.strictEqual(FakePlayer.all.length, 1);
    assert.strictEqual(FakePlayer.all[0]?.removed, false);
  });

  test('retries a wedged chime only once: no recreate loop', async () => {
    let created = 0;
    const s = new ChimeSlot('test', () => {
      created += 1;
      const p = new FakePlayer();
      p.stuck = true; // every player is wedged
      return p;
    }, VERIFY_MS);
    await s.play(1);
    await sleep(VERIFY_MS * 4 + 40);
    assert.strictEqual(created, 2);
  });

  test('recreates a player released by the system and plays anyway', async () => {
    const s = slot();
    await s.play(1);
    await clipFinished();
    FakePlayer.all[0]!.removed = true;
    await s.play(1);
    assert.strictEqual(FakePlayer.all.length, 2);
    assert.strictEqual(FakePlayer.all[1]?.playCalls, 1);
  });

  test('a creation failure is not fatal; the next play retries it', async () => {
    FakePlayer.failNextCreate = true;
    const s = slot();
    s.warmUp(1); // fails quietly
    await s.play(1); // retried, works
    assert.strictEqual(FakePlayer.all[0]?.playCalls, 1);
  });

  test('never throws when the replacement also fails to play', async () => {
    const s = slot();
    s.warmUp(1);
    FakePlayer.all[0]!.removed = true;
    await assert.doesNotReject(s.play(1));
  });

  test('a player that is still loading is played instead of skipped', async () => {
    const s = slot();
    s.warmUp(1);
    FakePlayer.all[0]!.isLoaded = false;
    await s.play(1);
    assert.strictEqual(FakePlayer.all[0]?.playCalls, 1);
  });
});

describe('ChimeSlot: dispose', () => {
  test('releases the player; later plays do not throw; the self-check does not run afterwards', async () => {
    const s = slot();
    s.warmUp(1);
    FakePlayer.all[0]!.stuck = true;
    await s.play(1);
    s.dispose();
    await sleep(VERIFY_MS + 30);
    assert.strictEqual(FakePlayer.all[0]?.removed, true);
    assert.strictEqual(FakePlayer.all.length, 1); // nothing recreated by the stale self-check
  });

  test('a play waiting on a seek when dispose runs does not touch the released player', async () => {
    const s = slot();
    s.warmUp(1);
    const pending = s.play(1);
    s.dispose();
    await pending;
    assert.strictEqual(FakePlayer.all[0]?.playCalls, 0);
  });
});
