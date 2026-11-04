/**
 * Prevents duplicate navigation from rapid double taps. The first push goes out immediately (no
 * delay); further pushes inside the lock window are ignored. Module-level so it also covers taps
 * on different cards in quick succession.
 */
const LOCK_MS = 600;
let lockedUntil = 0;

export function pushOnce(push: () => void): boolean {
  const now = Date.now();
  if (now < lockedUntil) return false;
  lockedUntil = now + LOCK_MS;
  push();
  return true;
}
