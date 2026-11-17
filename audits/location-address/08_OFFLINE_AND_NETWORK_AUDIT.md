# 08 — Offline & Network Audit

No network-throttling or offline device tests were executed. **All scenario results are code-derived (NOT TESTED).**

## 1. Network configuration in code

| Call | Timeout | Retry | Cancellation | Evidence |
|---|---|---|---|---|
| Gateway API (axios) | 15 s | queries: 2 retries with exponential backoff (not 401/403); mutations: 0 | — | `client.ts:42`; `queryClient.ts:37-47` |
| Google Geocoding | 8 s | none | `AbortController` + caller signal | `addressResolver.ts:24,75-87` |
| Nominatim | 8 s, serialised 1.1 s, 60 s backoff on 429/403 | none | yes | `:25-31,107-142` |
| Places autocomplete (New / legacy) | **none** | none | caller signal | `places.service.ts:37-60,88` |
| Place Details | **none** | none | **none** | `places.service.ts:184-225` |
| GPS | 9 s | — | promise dedupe | `location.service.ts:46` |

The offline mutation queue (`useOfflineQueue`, `NetworkProvider`) is **not used** for address create/update/delete or booking create. Queries use `networkMode:'offlineFirst'` (cached addresses visible offline).

## 2. Failure classes are mostly distinguished

| Failure | Detected as | User feedback | Recovery |
|---|---|---|---|
| Map tiles unavailable | — (SDK internal) | grey map; iOS spinner only | Pin still usable on blank map; no message ⚠ |
| GPS unavailable | `TIMEOUT` / `LOW_ACCURACY` / `SERVICES_DISABLED` / `PERMISSION_*` | Specific alerts | Manual pin ✅ |
| Geocoding unavailable | Silent fallback chain → "Location (lat, lng)" text | Coordinates shown as the address | Save still allowed with coordinate text ⚠ (LOC-005) |
| Backend unavailable | axios error | "Couldn't save address. Please check your connection" | Pin + form preserved on screen ✅; lost on leave ⚠ |
| Provider denied (billing / key) | **Not detected** (same as "no results") | none | ❌ LOC-001 |

## 3. Scenario matrix (expected vs code-derived current)

| # | Scenario | Expected | Current (code-derived) |
|---|---|---|---|
| 1 | Excellent internet | Address ≤ 1–2 s after pan | OSM-bound, ≈ 1.5–2 s single pan; backlog on repeated pans (LOC-009) |
| 2 | Normal 4G | same | same |
| 3 | Weak 4G | Progress state; no stale text | "Locating…" shown until the latest resolves ✅ |
| 4 | Slow 3G | Timeouts surface as "address unavailable — pin kept" | After 8 s each provider fails → native → coordinates text ✅ honest, ⚠ uninformative |
| 5 | High latency | Same as 3 | Same |
| 6 | Intermittent | No lost pin | Pin is local state ✅ |
| 7 | Packet loss | Same | Same |
| 8 | DNS failure | Fast fail to fallback | `fetch` rejects → fallback ✅ |
| 9 | API timeout | Fallback + message | Fallback, no message ⚠ |
| 10 | Google unavailable | Fallback provider, telemetry | Fallback ✅, no telemetry ❌ (this is the live state) |
| 11 | Offline while moving pin | Pin moves; address "offline" | Pin moves; native geocoder may fail → coordinates text ✅ |
| 12 | Offline while saving | Pin kept; retry available | Alert; pin kept while on screen ✅; no queued retry ⚠ (LOC-033) |
| 13 | Offline during booking | No duplicate booking; retry safe | Single-flight guard + `attempt_id` + server duplicate detection ✅. **But** `useCreateBooking` may first call `userApi.createAddress` (auto-create); if that fails it falls back to the placeholder UUID (LOC-007) |

## 4. Recommendations
1. Add timeouts and signals to all Places calls; treat 403/`REQUEST_DENIED`/`OVER_QUERY_LIMIT` as provider-down. Emit telemetry and show "Search unavailable — move the map instead".
2. Persist the in-progress picker draft (pin, label, details) in MMKV until saved or explicitly discarded.
3. Address save: keep the explicit retry (do not silently queue a save the user thinks is done); add a "Retry" button in the alert.
4. Show a distinct "Map couldn't load" overlay using `onMapLoaded` timeout detection, keeping the pin usable.
5. Booking must never auto-create an address. If the address is not saved, stop and send the user to the picker.
