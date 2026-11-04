/**
 * "Latest request wins" gate. Call `next()` when starting an async request and check
 * `isLatest(ticket)` before applying its result, so a slow older response can never overwrite a
 * newer one. `invalidate()` discards every in-flight request (e.g. on reset / manual override).
 */
export function createRequestGate() {
  let current = 0;
  return {
    next(): number {
      current += 1;
      return current;
    },
    isLatest(ticket: number): boolean {
      return ticket === current;
    },
    invalidate(): void {
      current += 1;
    },
  };
}
