/**
 * Shared, cancellable requests (pure; unit-testable).
 *
 * Concurrent callers asking for the same key share ONE underlying request. Each caller may abort
 * its own wait; when the last waiting caller aborts, the underlying request's signal is aborted too,
 * so queued work (e.g. a rate-limited OSM lookup) is dropped instead of executed for nobody
 * (audit LOC-009). A caller without a signal pins the request (it can never be cancelled).
 */

function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

export function createSharedRequests<T>() {
  interface Entry {
    promise: Promise<T>;
    controller: AbortController;
    waiters: number;
    pinned: boolean;
  }
  const inflight = new Map<string, Entry>();

  function run(key: string, factory: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(abortError());

    let entry = inflight.get(key);
    if (!entry) {
      const controller = new AbortController();
      const promise = factory(controller.signal);
      const created: Entry = { promise, controller, waiters: 0, pinned: false };
      entry = created;
      inflight.set(key, created);
      const clear = () => {
        if (inflight.get(key) === created) inflight.delete(key);
      };
      promise.then(clear, clear);
    }

    const e = entry;
    e.waiters += 1;

    if (!signal) {
      e.pinned = true;
      return e.promise.finally(() => {
        e.waiters -= 1;
      });
    }

    return new Promise<T>((resolve, reject) => {
      let done = false;
      const release = () => {
        if (done) return false;
        done = true;
        e.waiters -= 1;
        signal.removeEventListener('abort', onAbort);
        return true;
      };
      const onAbort = () => {
        if (!release()) return;
        if (e.waiters <= 0 && !e.pinned) {
          e.controller.abort();
          if (inflight.get(key) === e) inflight.delete(key);
        }
        reject(abortError());
      };
      signal.addEventListener('abort', onAbort, { once: true });
      e.promise.then(
        (v) => {
          if (release()) resolve(v);
        },
        (err) => {
          if (release()) reject(err);
        }
      );
    });
  }

  return {
    run,
    size: (): number => inflight.size,
    clear: (): void => inflight.clear(),
  };
}
