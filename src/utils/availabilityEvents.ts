/**
 * Tiny pub/sub so any screen can tell the availability hooks "this worker's calendar changed"
 * (booking created, booking failed with a slot conflict, booking cancelled, ...).
 * Hooks refetch from the backend; nothing is ever generated or patched locally.
 */
type Listener = (workerId: string | null) => void;
const listeners = new Set<Listener>();

export function onAvailabilityInvalidated(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Pass the worker id whose calendar changed, or null to refresh every mounted calendar. */
export function invalidateAvailability(workerId: string | null = null): void {
  listeners.forEach((fn) => {
    try {
      fn(workerId);
    } catch {
      /* a failing listener must not block others */
    }
  });
}

/** True for the backend's "slot no longer free" family of responses. */
export function isSlotConflictError(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const code = err?.response?.data?.error?.code ?? err?.response?.data?.code ?? err?.code;
  return (
    status === 409 ||
    code === 'WORKER_NOT_AVAILABLE' ||
    code === 'CONCURRENT_BOOKING_LOCK' ||
    code === 'SLOT_HELD_BY_ANOTHER_USER' ||
    code === 'SLOT_NOT_AVAILABLE'
  );
}
