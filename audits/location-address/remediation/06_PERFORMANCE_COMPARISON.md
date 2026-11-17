# 06 — Performance Comparison

**Honesty note.** No physical device, emulator, network throttling or load test was available in this session. Nothing below is a device measurement. Each row is labelled:
- **LIVE** — measured against real services in the audit (2026-11-16).
- **SIM** — simulation that runs the real changed module with latencies taken from the LIVE measurements.
- **CODE** — follows deterministically from the code path (request counts).

## 1. Rapid pin moves (LOC-009) — SIM
Script: `audits/location-address/remediation/bench_pin_backlog.ts` (run: `node --experimental-strip-types <path>`). It uses the real `src/utils/sharedRequest.ts`, a 1.1 s-spaced OSM queue, LIVE latencies (Google denied ≈ 600 ms, public OSM ≈ 1300 ms), a 500 ms debounce, and 5 pin releases 0.7 s apart. Three runs each.

| Strategy | Last pin → its address shown | OSM requests sent for 5 pins |
|---|---|---|
| Before: shared work not cancellable; Google ∥ OSM, wait for both | **4370 / 4500 / 4270 ms** | **5** |
| After: cancellable shared work; Google first, OSM as fallback | **2510 / 2590 / 2520 ms** | **1** |

That is about 42% less wait and 80% fewer rate-limited OSM requests in the current state, where Google is denied. The simulation does not include the provider breaker. With it, a denied Google is skipped after the first failure, removing about 600 ms more per lookup. With billing enabled and the backend proxy in place, OSM is not on the critical path at all.

## 2. Search keystrokes while Google is denied (LOC-001) — LIVE + CODE

| | Before | After |
|---|---|---|
| Google calls per debounced keystroke | 2 (Places New 403 → legacy REQUEST_DENIED), every keystroke | 1 the first time; then **0 for 10 min** (breaker) |
| Wasted latency per keystroke | LIVE: 230–1835 ms per failing call (×2) | ≈ 0 after the first |
| Result shown | Customer's own text echoed as a "result" | Real area names labelled "approximate" |

## 3. Place Details billing (LOC-027) — CODE + Google docs
The field mask no longer includes `displayName`. Requests now bill at the Places **Essentials** SKU instead of **Pro**, both client and proxy. Google's docs state that a mixed mask bills at the highest SKU. Actual cost depends on current pricing.

## 4. Reverse geocoding provider calls — CODE

| Situation | Before | After |
|---|---|---|
| Google healthy, street-level answer | Google + OSM (both, every lookup) | Google only |
| Google weak (area/city only) | Google + OSM | Google + OSM |
| Google denied | Google (fail) + OSM, every lookup | OSM only after the first denial |
| Backend proxy deployed | n/a | 1 proxy call (server cache; Google-first) |
| Repeated identical cell, concurrent | shared | shared, and cancelled if nobody waits |

## 5. GPS acquisition — CODE
- **Approximate permission:** before, it always ran the full 9 s and then failed. After, it gives up after **≤ 4 s** with an actionable "Allow precise" prompt, plus an approximate centre.
- **Map centring while the fix converges:** an OS last-known fix (no GPS power) centres the map immediately when recent and within limits. Before, the user saw the city overview until the fix arrived.
- **Outlier fixes:** no longer settle an acquisition alone. This may add one sample interval (about 0.5 s) only when a jump is detected.

## 6. Re-render / lifecycle — CODE
- Map region state behaviour is unchanged (one screen render per pan end, as before).
- The new draft persistence writes one small MMKV record per pan end or details edit. It is synchronous and sub-millisecond for MMKV, but not measured here.
- No new listeners without cleanup. The map-load timer is cleared on load or unmount.

## 7. What must be measured on devices (unchanged from audit doc 07 §4)
Tap → first map frame; time to live fix p50/p90; pan end → address p50/p90; frame drops on a low-end Android; memory over 20 open/close cycles; battery over 5 min on the picker.

The new `locationTelemetry` events (`location_acquire`, `geocode`, `search`, `place_details`, `map_load_timeout`) record exactly these durations and outcomes. They contain no coordinates. Attach an analytics sink via `subscribeLocationEvents` to collect them from real users.
