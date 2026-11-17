# 10 — Scalability & Cost Audit

The figures below are **models derived from the code paths**, not load-test results (none were run). Google prices change, so verify them against the current Maps Platform pricing page before budgeting. Per-request costs are therefore given as variables, not dollar amounts.

## 1. Request volume per customer action (current code)

| Action | Google calls (if billing enabled) | OSM calls | Backend calls |
|---|---|---|---|
| Open picker with live fix | 1 Geocoding | 1 | 0 |
| Each settled pan (≥ 2 m, uncached ~1 m cell) | 1 Geocoding | 1 | 0 |
| Search: N debounced keystrokes + select | N Autocomplete (New) (session) + 1 Place Details **Pro** (LOC-027) | 0 | 0 |
| Same, when Places (New) fails | N × (New + legacy) + native | 0 | 0 |
| Save address | 0 | 0 | 1 POST + 1 GET refetch |
| Home header resolve | 1 Geocoding per new 1 m cell | 1 | 0 |
| Booking with unsaved address | 1 Geocoding (+1 OSM) + address POST | 1 | 2 |

The client cache is per device and in memory (200 entries, 24 h TTL), so there is **no cross-user reuse**. Every customer resolving the same Faisalabad block pays again. A server-side cache (Redis, ~1 m cells; already implemented in booking-service for workers) would collapse repeated cells across all users.

## 2. Load model

Assumptions (to be replaced with analytics): 1 address-flow session per active customer per day, 4 settled pans, 6 search keystrokes in 30% of sessions.

| Concurrent / active customers | Geocoding req/day (client-direct) | Autocomplete req/day | Public OSM req/day | Comment |
|---|---|---|---|---|
| 100 | ~500 | ~180 | ~500 | OSM tolerable |
| 1,000 | ~5,000 | ~1,800 | ~5,000 | Breaches the public Nominatim "no heavy use" policy (LOC-010) |
| 10,000 | ~50,000 | ~18,000 | ~50,000 | OSM blocks likely; Google cost material without caching |
| 100,000 | ~500,000 | ~180,000 | not viable | Requires a server proxy + cache + self-hosted geocoder |

With a server cache, the hit rate for a single-city service is expected to be high: pins cluster on homes and societies. Measure it; do not assume a figure.

## 3. Backend throughput & database

| Component | Assessment |
|---|---|
| `user_addresses` CRUD | Indexed by `user_id`; per-user advisory lock serialises only that user's writes. Scales linearly ✅ |
| Booking create | Redis multi-slot lock + `JobSiteService` single indexed lookup (`user_addresses` PK) ✅ |
| `nearby` workers | GIST `ST_DWithin` ✅ + 4 correlated sub-queries per candidate ❌ (LOC-024). Cache results per (geohash6, category, radius) for 30–60 s; client already rounds to 3 dp |
| Geofence | Redis-first telemetry, DB fallback by PK ✅ |
| Connection pooling | `pg` Pool per service (not sized in this audit; NOT TESTED) |
| Rate limiting | `limiters.write` on address writes; `limiters.addressResolve` on resolver ✅ |
| Retry storms | Client queries 2 retries with exponential backoff capped by `MAX_RETRY_DELAY_MS`; mutations 0 ✅. GPS retries are user-driven ✅ |

## 4. Cost-reduction opportunities (no quality loss)
1. **Server-side geocode/search proxy with Redis cache**: shared hits, key secrecy, provider failover in one place.
2. **Google first, OSM only on failure.** Today both run on every lookup and the client waits for both.
3. **Place Details field mask without `displayName`** → Essentials SKU (Google doc: mixing SKUs bills the highest).
4. **Skip reverse geocoding when GPS radius > 50 m** (the text would be misleading anyway).
5. **Don't geocode on programmatic camera moves** that land on an already resolved point (largely in place via the 2 m same-spot check).
6. **Debounce autocomplete at 350 ms with min 3 characters** (currently 2), and stop after a selection (already done).
7. **Budget alerts + per-API quotas** in Cloud Console.
