# 05 — GPS Accuracy Audit

Core engine: `src/services/location/location.service.ts` → `acquireFreshGPSPosition()` (`:127-414`).

## 1. How a fix is acquired

1. Check that location services are enabled and permission is granted (`:148-203`). On Android with services off, the Google Play "turn on location" dialog is shown (`enableNetworkProviderAsync`, `:152-177`).
2. Start `watchPositionAsync` (Android `Accuracy.Highest`, iOS `BestForNavigation`, 500 ms interval, 0 m distance) **and** a one-shot `getCurrentPositionAsync` racer (`:294-330`).
3. Each sample is rejected if:
   - lat or lng is NaN (`:229-237`)
   - accuracy is missing or negative (`:239-241`)
   - it is `mocked` (unless `allowMock`) (`:244-249`)
   - it is older than `maxAgeMs` = 10 s (`:252-256`)
4. Keep the best (smallest radius) sample. **Resolve immediately at ≤ 20 m** (`:271-290`).
5. At 9 s: accept the best sample if ≤ 35 m. Otherwise return `LOW_ACCURACY` (with the radius), `MOCK_DETECTED` or `TIMEOUT` (`:333-389`).
6. Always remove the watcher and timer (`:211-220,402-409`). A single in-flight promise is shared by all callers (`:129-131`).
7. Cache successful fixes to MMKV (`localStorage.cacheLastLocation`) for warm starts (`:281-284`).

The non-forced path (`getCurrentPosition({useCacheFirst:true})`, `:422-486`) first tries `getLastKnownPositionAsync({maxAge: 60 s, requiredAccuracy: 35 m})`. It deliberately never falls back to the persisted cache.

## 2. Checklist

| Question | Answer | Evidence |
|---|---|---|
| Time to first fix | Up to 9 s worst case; resolves early at ≤ 20 m. **Not measured on device.** | `:46` |
| Stale cached coordinates used? | Not for "you are here": fixes older than 10 s are rejected; last-known ≤ 60 s only for the home header. Hydrated `currentLocation` (any age) is used for **discovery only**, not saving or booking. | `:252-256,439-443`; `location.store.ts:18-30` |
| Is the latest location more accurate? | The best-radius sample wins, not the latest. Correct for a stationary user. | `:271-273` |
| Horizontal accuracy respected? | Yes (20 m target, 35 m cut-off; onboarding 45 m) | `:44-45`; `location-permission.tsx:117-118` |
| Timestamps checked? | Yes (10 s). `loc.timestamp || Date.now()` treats a missing timestamp as fresh (minor). | `:252` |
| Low-accuracy coordinates accepted? | No, except: last-known ≤ 35 m up to 60 s old is marked as `liveLocation` (`useLocation.ts:94-102`). That is acceptable for the header, but `liveLocation` later seeds the picker and booking fallback. | — |
| GPS jumps handled? | **No** outlier test (LOC-019) | — |
| Coordinates swapped? | No (see doc 02 §6) | — |
| Lat/lng validated? | NaN checks on device; `isValidCoordinate` (finite, range, not 0,0) used for distances; service-area polygon before saving or booking | `locationUtils.ts:44-57` |
| Rounding? | Accuracy rounded to 0.1 m. Coordinates are **not** rounded for addresses or bookings. Discovery queries round to 3 dp (≈110 m), on purpose and tested. | `:261`; `locationUtils.ts:225-228` |
| Approximate vs precise permission? | **Not distinguished** (LOC-012) | no reference to `android.accuracy` |
| GPS used when last-known suffices? | Home header uses last-known first. The picker and quick sheets always request a fresh fix, which is the right call for an address. | — |
| Confidence shown to the customer? | **No.** Accuracy is only shown in the `LOW_ACCURACY` error text. | LOC-020 |
| Mock detection | Android `mocked` flag only; iOS has no equivalent in expo-location. Rejected by default. | `:244-249` |

## 3. Scenario behaviour (code-derived; device tests NOT TESTED)

| # | Scenario | Expected (target) | Current behaviour (from code) |
|---|---|---|---|
| A | Strong GPS outdoors | Fix ≤ 20 m in 1–5 s | Resolves at the first ≤ 20 m sample. ✅ |
| B | Weak GPS | Approximate fix with honest radius; ask user to adjust pin | Best ≤ 35 m accepted at 9 s; otherwise `LOW_ACCURACY` error, no fix. ⚠ |
| C | Indoors | Wi-Fi fix (30–80 m typical) used to centre the map, flagged approximate | Rejected if > 35 m → error alert, map stays on the city overview. ❌ |
| D | Dense buildings / multipath | Reject inconsistent jumps | Best radius wins; no jump test. ⚠ |
| E | Underground parking | Timeout → manual pin | `TIMEOUT` after 9 s → alert; manual pin works. ✅ |
| F | High-rise apartment | Fix + floor/flat in details | Fix as C; no flat or floor field (notes dropped). ❌ |
| G | Wi-Fi only | As C | As C. ❌ |
| H | Cellular only (≈300 m–2 km) | Centre only | Rejected `LOW_ACCURACY`. Acceptable to not save; poor that it is not used to centre. ⚠ |
| I | GPS disabled | Prompt to enable | Android: system dialog; iOS: alert + Settings. ✅ |
| J | Permission denied | Explain + manual pin | `PERMISSION_DENIED`/`BLOCKED` with Settings link; picker usable manually. ✅ |
| K | Approximate permission | Ask for precise; use approximate for centre | Always `LOW_ACCURACY` "move near a window". ❌ LOC-012 |
| L | Revoked while running | Detect on next use / foreground | Next acquisition returns `PERMISSION_DENIED`. The foreground check runs only when status ≠ granted or location missing, so a granted→revoked change is detected lazily. ⚠ |
| M | Device location services off | As I | As I. ✅ |
| N | Stale last-known | Ignore for addresses | Ignored (10 s / 60 s limits). ✅ |
| O | Jump of hundreds of metres | Discard | Accepted if its reported radius is the best. ⚠ |
| P | Mock location | Reject / flag | Android: rejected (`MOCK_DETECTED`). iOS: undetected. ⚠ |

## 4. Recommended confidence-based acceptance strategy

The rule: **a GPS fix may move the map; only a human-confirmed pin may become an address.** Thresholds below are starting values that must be calibrated on real devices in Faisalabad (§5).

| Use case | Accept when | Display | Action |
|---|---|---|---|
| Centre the map / discovery | radius ≤ 150 m **or** approximate grant; age ≤ 2 min | "Approximate location (±R m)" | Centre the map; do **not** resolve an address automatically if R > 50 m |
| Pre-place the pin for a new address | radius ≤ 35 m, age ≤ 10 s, not mocked, passes jump test | Blue dot + accuracy circle; "Pin is X m from you" | Seed the pin; the user must confirm |
| "Use my location" one-tap save | radius ≤ 20 m, age ≤ 10 s, not mocked, ≥ 2 consistent samples | Accuracy badge in the confirm sheet | Allowed, with a confirm sheet |
| Job-site arrival (worker) | existing geofence rules | — | unchanged |

Signals to evaluate per sample:
- `accuracy` (horizontal radius)
- `timestamp` age
- `mocked`
- provider/source where available
- displacement from the previous accepted fix vs `sqrt(acc1² + acc2²)` × 3 (jump test)
- permission accuracy (`fine`/`coarse`; iOS `reducedAccuracy` when exposed)

Persist with the saved address: `location_source` (`gps_confirmed` | `pin_adjusted` | `search` | `manual`), `gps_accuracy_m`, `pin_distance_from_gps_m`, `captured_at`.

## 5. Real-device validation plan (required before tuning)
Devices:
- Low-end Android (2–3 GB RAM, Android 11–13)
- Mid-range Android 14
- iPhone (iOS 17+)

Locations in Faisalabad:
- Open street (D-Ground)
- Inside a ground-floor house
- 5th+ floor apartment
- Basement parking
- Dense market (Clock Tower bazaars)
- University campus

For each location, record 20 acquisitions:
- time-to-first-fix and time-to-≤20 m
- final radius
- error versus a surveyed ground truth (phone on the marked point)
- outcome code

Choose thresholds at the 90th percentile of the error distribution per environment. **All rows above remain NOT TESTED until this is done.**
