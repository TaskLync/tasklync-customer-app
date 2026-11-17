/**
 * Simulation (NOT a device measurement): time from the LAST pin move to its address appearing,
 * for N rapid pin moves, old vs new resolver strategy. Uses the real createSharedRequests module.
 *
 * Provider latencies are the live values measured in the audit (2026-11-16):
 *   Google (billing denied) ≈ 600 ms to fail; public OSM ≈ 1300 ms; OSM spacing 1100 ms.
 * Time is scaled by SCALE to keep the run short; results are reported unscaled.
 */
import { createSharedRequests } from '../../../src/utils/sharedRequest.ts';

const SCALE = 0.1;
const GOOGLE_MS = 600 * SCALE;
const OSM_MS = 1300 * SCALE;
const OSM_GAP = 1100 * SCALE;
const DEBOUNCE = 500 * SCALE;
const MOVE_EVERY = 700 * SCALE; // user lets go every 0.7 s (debounce fires each time)
const N = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeOsmQueue() {
  let chain: Promise<unknown> = Promise.resolve();
  let last = -1e9;
  return (signal?: AbortSignal) => {
    const run = async () => {
      if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      const wait = last + OSM_GAP - Date.now();
      if (wait > 0) await sleep(wait);
      if (signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      last = Date.now();
      await sleep(OSM_MS);
      return 'osm';
    };
    const p = chain.then(run, run);
    chain = p.catch(() => undefined);
    return p;
  };
}

async function scenario(strategy: 'old' | 'new'): Promise<{ lastMs: number; osmCalls: number }> {
  const osm = makeOsmQueue();
  let osmCalls = 0;
  const shared = createSharedRequests<string>();
  let current: AbortController | null = null;
  let lastDone = 0;
  const lastMoveAt: { t: number } = { t: 0 };

  const lookup = (i: number, callerSignal: AbortSignal) => {
    if (strategy === 'old') {
      // old: shared work started WITHOUT the caller's signal; Google ∥ OSM, wait for both
      return shared.run(`cell${i}`, async () => {
        osmCalls++;
        await Promise.all([sleep(GOOGLE_MS), osm()]);
        return 'addr';
      }).then((v) => { if (callerSignal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' }); return v; });
    }
    // new: cancellable shared work; Google first (denied fast), OSM only as fallback
    return shared.run(`cell${i}`, async (sig) => {
      await sleep(GOOGLE_MS);
      if (sig.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      osmCalls++;
      return osm(sig);
    }, callerSignal);
  };

  const pending: Promise<void>[] = [];
  for (let i = 0; i < N; i++) {
    current?.abort();
    const ctrl = new AbortController();
    current = ctrl;
    lastMoveAt.t = Date.now();
    const idx = i;
    pending.push(
      sleep(DEBOUNCE).then(async () => {
        if (ctrl.signal.aborted) return;
        try {
          await lookup(idx, ctrl.signal);
          if (idx === N - 1) lastDone = Date.now();
        } catch { /* superseded */ }
      })
    );
    if (i < N - 1) await sleep(MOVE_EVERY);
  }
  const moveT = lastMoveAt.t;
  await Promise.all(pending);
  // let any orphaned (old) work drain so calls are counted
  await sleep((OSM_GAP + OSM_MS) * N);
  return { lastMs: Math.round((lastDone - moveT) / SCALE), osmCalls };
}

const runs = 3;
for (const s of ['old', 'new'] as const) {
  const res: number[] = [];
  let calls = 0;
  for (let k = 0; k < runs; k++) {
    const r = await scenario(s);
    res.push(r.lastMs);
    calls = r.osmCalls;
  }
  console.log(`${s}: last-pin address after ${res.join(' / ')} ms (simulated), OSM requests for ${N} pins: ${calls}`);
}
