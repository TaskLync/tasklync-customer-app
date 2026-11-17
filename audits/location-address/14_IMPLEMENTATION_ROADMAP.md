# 14 — Implementation Roadmap

Ordered by risk-to-customer and dependency. Each item lists its acceptance criteria. Complexity S/M/L ≈ <1 / 1–3 / >3 dev-days.

## Phase 0 — Stop the bleeding (before any production traffic)

| # | Item | Fixes | Depends on | Size | Acceptance criteria |
|---|---|---|---|---|---|
| 0.1 | Enable billing; create restricted SDK keys (Android package+SHA-1, iOS bundle) and a server-only web-service key; rotate the committed key; budget alerts + quotas | LOC-001, LOC-003 | — | S (ops) | Live probe: Places (New) + Geocoding return OK with the server key; the SDK key is **denied** for Geocoding; Android device renders tiles; `git grep AIza` empty in app config |
| 0.2 | Remove key literals from `app.config.ts` / `eas.json`; EAS secrets | LOC-003 | 0.1 | S | Build succeeds from secrets only; old key revoked |
| 0.3 | Quick-add sheet: no silent GPS coordinates; "Add new" opens the map picker | LOC-002 | — | S | Unit + device test: typed text can never be saved without a pin confirmed on the map or an explicit GPS tap |
| 0.4 | Remove placeholder address UUIDs and demo address fallbacks; booking/custom request must have an owned saved address | LOC-007, LOC-013 | — | S | `grep CANONICAL_FALLBACK_UUIDS.ADDRESS` → 0; missing address → user sent to picker before any POST |
| 0.5 | Centralise address-removed handling (list delete, hydrate reconcile) | LOC-006, LOC-017 | — | S | Delete-then-book scenario blocked with "Select an address" |

## Phase 1 — Trust boundaries & data model (sprint 1)

| # | Item | Fixes | Depends | Size | Acceptance |
|---|---|---|---|---|---|
| 1.1 | `ENFORCE_ADDRESS_OWNERSHIP=true` in all envs; `JobSiteService` in custom-request create; booking reads `address_text` (+instructions) from DB | LOC-008 | — | M | Contract tests: foreign `address_id` → 404 on bookings & custom requests; drift → stored text matches stored coordinates |
| 1.2 | Migration: baseline DDL + structured fields + instructions + source/accuracy; validators (finite, not (0,0), PK bbox) | LOC-004/005/018/022/023 | — | M | Round-trip test: every client field persists; old clients unaffected |
| 1.3 | Client: send/read new fields; `useAddresses` mapper keeps notes; booking snapshot of instructions; worker app displays them | LOC-004 | 1.2 | M | E2E: notes typed by customer visible on the worker job card |
| 1.4 | Editable structured address form prefilled from geocoder | LOC-005 | 1.2 | M | Customer can enter house/street/block when the geocoder returns only the area |
| 1.5 | Defaults only for the first address | LOC-014 | — | S | Adding a second address leaves the default unchanged |

## Phase 2 — Accuracy & latency (sprint 2)

| # | Item | Fixes | Depends | Size | Acceptance |
|---|---|---|---|---|---|
| 2.1 | Open the booking-service resolver to customers as `/geo/reverse`, add `/geo/autocomplete` + `/geo/place` (Essentials field mask); client switches; Google-first, OSM fallback | LOC-009/010/011/027 | 0.1 | M | p90 pan→address ≤ baseline/2 on 4G (measure first); one provider call per settled pan; cache hit rate reported |
| 2.2 | Confidence tiers + approximate-permission detection + jump filter | LOC-012/019 | — | M | Device protocol (doc 05 §5): indoor fixes centre the map with "approximate ±R m"; coarse grant prompts for precise |
| 2.3 | Blue dot + accuracy circle + "pin is X m from you" | LOC-020 | 2.2 | S | Visible on picker; hidden when no live fix |
| 2.4 | `refreshLocation` switches mode only on success; booking never mixes id + GPS | LOC-015/016 | — | S | Unit tests |
| 2.5 | Provider-down UX + telemetry; timeouts on Places | LOC-001/011 | 2.1 | S | Stubbed `REQUEST_DENIED` shows "Search unavailable"; event emitted |

## Phase 3 — Scale, polish, last metre (sprint 3+)

| # | Item | Fixes | Size | Acceptance |
|---|---|---|---|---|
| 3.1 | Nearby query: replace correlated sub-queries, short-TTL geohash cache | LOC-024 | M | `EXPLAIN ANALYZE` at 10k workers within the agreed budget; k6 1k VU p95 measured |
| 3.2 | Persist picker draft; retry button | LOC-033 | S | Kill app mid-pick → draft restored |
| 3.3 | iOS "Always" string removed; MMKV encryption for location store; logout clears | LOC-021, S9/S10 | S | Info.plist check; logout test |
| 3.4 | Consolidate helpers (haversine, picker file duplicate, unused API, single last-location cache); fix Place Details city parse; language normalisation | LOC-026/028/029/030/032 | S | Lint/tests green |
| 3.5 | Entrance pin + SearchDestinations pilot behind a flag (only after a coverage study and launch-stage check) | last metre | L | ≥ X% of 50 sampled Faisalabad addresses return entrances (set X after the study) |
| 3.6 | Worker app: no (0,0) fallback | LOC-031 | S | Missing coordinates show "Location unavailable", not a navigation link |
| 3.7 | Daily live-provider canary in CI | LOC-001 | S | A billing or key failure alerts within 24 h |

## Dependency graph
```
0.1 → 0.2
0.1 → 2.1 → 2.5
1.2 → 1.3, 1.4
2.2 → 2.3
(0.3, 0.4, 0.5, 1.1, 1.5, 2.4 independent)
```
