# 11 — Test Scenario Matrix & Testing Strategy

**Result rules:**
- **PASS** / **FAIL** only when the scenario was executed in this audit.
- **FAIL (code)** = defect proven by tracing the code path. It still needs an executed regression test.
- **NOT TESTED** = not executed; the "Actual" column describes code-derived behaviour.

## 1. Executed

| # | Scenario | Expected | Actual | Result | Evidence | Sev |
|---|---|---|---|---|---|---|
| T1 | Existing address/location unit suites | all pass | 42/42 pass | **PASS** | `node --test __tests__/address/*.test.ts __tests__/location/*.test.ts` (2026-11-16) | — |
| T2 | Places API (New) autocomplete with app key, 7 PK inputs | suggestions | HTTP 403 `PERMISSION_DENIED` ×7 | **FAIL** | live probe | P0 |
| T3 | Places legacy autocomplete, 7 PK inputs | suggestions | `REQUEST_DENIED` billing ×7 | **FAIL** | live probe | P0 |
| T4 | Google reverse geocode (public city-centre point) | `OK` | `REQUEST_DENIED` billing | **FAIL** | live probe | P0 |
| T5 | Google forward geocode "Madina Town, Faisalabad" | `OK` | `REQUEST_DENIED` billing | **FAIL** | live probe | P0 |
| T6 | Nominatim reverse (city centre) | readable address ≤ 2 s | 200, 1.3 s, "Clock Tower…" (Urdu script without language param) | **PASS** (latency/lang noted) | live probe | — |
| T7 | Same key across config sources | one SDK key, no web key in client | identical key in `.env`, `app.config.ts`, 4× `eas.json` | **FAIL** | SHA-256 fingerprints | P0* |

## 2. Code-proven defects (need executed regression tests)

| # | Scenario | Expected | Actual (code) | Result | Evidence | Sev |
|---|---|---|---|---|---|---|
| C1 | Quick-add sheet: GPS at A, type street B, save | coordinates of B or forced map confirmation | coordinates of A saved | FAIL (code) | LOC-002 | P0 |
| C2 | Save address with notes "Flat 3B, blue gate" | notes persisted & shown to worker | dropped in client mutation and by backend schema | FAIL (code) | LOC-004 | P1 |
| C3 | Delete selected address from list, then book | blocked / reselect | booking sent with deleted id → 404 in prod | FAIL (code) | LOC-006 | P1 |
| C4 | Booking where address creation fails | block with message | placeholder UUID sent | FAIL (code) | LOC-007 | P1 |
| C5 | Custom request with "Current Location" | pin-confirmed address | new default address "<city>, Pakistan" | FAIL (code) | LOC-013 | P1 |
| C6 | 5 rapid pin moves | final address ≈ debounce + 1 RTT | final address after OSM queue drains (~5–6 s) | FAIL (code) | LOC-009 | P1 |
| C7 | Approximate (coarse) permission → "Use my location" | ask for precise / approximate centre | `LOW_ACCURACY` "move near a window" | FAIL (code) | LOC-012 | P1 |
| C8 | Rapid pin moves A→B→C, A slowest | C's address shown | C's address shown | PASS (unit-tested gate; hook not tested) | `requestGate.test.ts` | — |
| C9 | Add a second address via quick sheet | default unchanged | becomes default | FAIL (code) | LOC-014 | P2 |
| C10 | "Use current location" fails indoors | saved selection kept | selection cleared | FAIL (code) | LOC-015 | P2 |

## 3. Not tested (require device / environment)

| # | Scenario | Expected | Actual | Result | Sev if failing |
|---|---|---|---|---|---|
| N1 | Android map tiles with billing disabled | map renders | likely grey | NOT TESTED | P0 |
| N2 | GPS scenarios A–P (doc 05 §3) | per doc 05 | code-derived | NOT TESTED | P1 |
| N3 | Time to first map frame (low-end Android) | baseline | — | NOT TESTED | P2 |
| N4 | Offline scenarios 1–13 (doc 08) | per doc 08 | code-derived | NOT TESTED | P1–P2 |
| N5 | Native geocoder results for PK inputs | real places | — | NOT TESTED | P1 |
| N6 | Pin tip on map centre | ≤ 2 px | — | NOT TESTED | P3 |
| N7 | `EXPLAIN ANALYZE` nearby query at 10k workers | index scan, < 50 ms | — | NOT TESTED | P2 |
| N8 | Logout clears location store & draft | cleared | — | NOT TESTED | P3 |
| N9 | iOS mock location | flagged | not detectable | NOT TESTED | P3 |

## 4. Recommended test strategy

| Layer | Tooling | Must cover |
|---|---|---|
| Unit (node:test, existing harness) | pure functions | acquisition state machine (inject a fake `expo-location`: accuracy sequences, stale timestamps, mocked, timeout); jump filter; `useAddresses` payload mapper (would catch LOC-004); booking address assembly (LOC-007/016); store sync on delete/hydrate (LOC-006/017); Place Details parser (LOC-026) |
| Hook tests | `@testing-library/react-native` | `useReverseGeocode` debounce/abort/gate; `usePlacesAutocomplete` session token lifecycle |
| API contract | zod schemas shared or mirrored + supertest | `/users/me/addresses` round-trips every client field; `POST /bookings` with foreign/unknown `address_id` → 404; coordinate drift → saved point and matching text |
| Backend integration | Postgres + PostGIS container | lng/lat order, SRID 4326, one-default invariant under concurrent writes, address limit, custom-request ownership |
| E2E | Maestro (Android emulator + device farm) | picker happy path; permission denied/blocked; services off; offline save; delete-then-book |
| GPS simulation | emulator `adb emu geo fix`, mock-location app, iOS Simulator GPX | accuracy degradations, jumps, mocked |
| Network | Android emulator network profiles / Charles throttling; provider-denied stub | doc 08 scenarios 1–13 |
| Physical devices | doc 05 §5 protocol | accuracy distributions per environment |
| Load | k6 against staging | nearby at 100/1k/10k virtual users; address CRUD; geocode proxy hit rate |
| Live provider canary | `scripts/live-geocode-check.mjs` + Places probe in CI (daily) | billing/key failures detected within a day |
