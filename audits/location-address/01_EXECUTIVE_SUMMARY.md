# 01 — Executive Summary: Location, Maps & Address Infrastructure Audit

**Date:** 2026-11-16
**Scope:**
- Tasklync customer app (`develop`, Expo SDK 57 / RN 0.86)
- Backend user-service, booking-service and worker-service (`tasklync-backend@b246f00`)
- Worker-app consumption of the job site

**Method:**
- Full code trace from GPS to worker navigation.
- 42 existing unit tests executed.
- Live replay of the app's own Google/OSM requests (7 Pakistani inputs + reverse/forward geocode).
- No code, schema, env, data or infrastructure changes.

**Not done:** physical-device tests, network throttling, database `EXPLAIN`, load tests. These are marked NOT TESTED throughout.

## Headline
The location **engineering** is better than average. The GPS acquisition engine, the race-safe geocoding hooks, the PostGIS model and the booking snapshots are well built. The location **system as deployed is not production-ready**, for three reasons:

1. **Google is switched off.** The Maps Platform project behind the app's key has billing disabled. Places (New) returns 403, and legacy Places and Geocoding return `REQUEST_DENIED` (verified live). Search shows the customer's own words as "results". Address text comes only from public OpenStreetMap or the phone's geocoder. Android map tiles are likely affected (not device-tested). The code swallows these errors, so nobody noticed.
2. **Wrong-destination paths exist.**
   - The quick-add address sheet saves a typed street with the coordinates of wherever the phone currently is (LOC-002).
   - Custom requests can create a "Faisalabad, Pakistan" default address (LOC-013).
   - Deleted addresses stay bookable (LOC-006).
   - Placeholder address UUIDs are sent to the backend (LOC-007).
   - Backend job-site verification runs only in production and never for custom requests (LOC-008).
3. **Last-meter information never reaches the worker.** Notes such as "Flat 3B, blue gate, near the mosque" are dropped by the client mutation *and* by the backend schema (LOC-004). The address text is not editable and has no house/street/block fields (LOC-005). For Pakistani addresses this matters a great deal.

There is also a security issue: the single Maps key is committed in `app.config.ts` and `eas.json` and is used from JS for web services, so it cannot be restricted. That becomes a P0 billing exposure the moment billing is turned back on (LOC-003). Fix 0.1/0.2 together.

## Scores (evidence-based, /10)

| Dimension | Score | Basis |
|---|---|---|
| Architecture quality | **6** | Clean layering, a correct PostGIS model, booking snapshots, a resolver abstraction. Minus: client-side provider calls, three copies of address state, trust gaps in booking/custom requests |
| GPS accuracy & reliability | **6.5** | Fresh-fix engine with accuracy, age and mock checks, dedupe and cleanup. Minus: no approximate-permission handling, indoor fixes rejected, no jump filter, no confidence UI |
| Address accuracy | **2.5** | Google denied live; no structured fields; text not editable; notes lost; fallback suggestions echo the query |
| Map loading performance | **6** | Map never blocks on GPS; debounced, cached, race-safe geocoding; marker optimisations. Minus: OSM queue backlog; Android tiles unverified; no device measurements |
| Offline resilience | **4.5** | Honest fallbacks; pin kept on save failure; booking idempotent. Minus: Places calls have no timeouts; provider-down undetected; draft lost on exit; booking auto-creates addresses |
| Backend reliability | **7** | Ownership-scoped queries, advisory locks, one-default index, PK bbox on bookings, geofence design. Minus: prod-only ownership flag, unverified custom requests, missing baseline DDL |
| Security | **3.5** | Committed, unrestrictable web-service key; pins sent to public OSM; iOS "Always" text. Positives: good authz on address CRUD, no coordinate logging |
| Scalability | **5** | GIST everywhere, rounded discovery keys. Minus: no shared geocode cache, public Nominatim dependency, correlated nearby sub-queries |
| **Overall production readiness** | **3.5** | Blocked by LOC-001, LOC-002 and LOC-003 |

## Final conclusions

**Working correctly (keep it):**
- GPS acquisition engine (freshness, accuracy, mock rejection, timeouts, watcher cleanup, dedupe).
- `liveLocation` vs hydrated location separation.
- Latest-request-wins geocoding and autocomplete (no stale overwrite of the pin address).
- Provider-agnostic candidate ranking that never invents address parts.
- Fixed-centre-pin picker that never blocks on GPS.
- Double-submit guards, `attempt_id` and server duplicate detection.
- user-service ownership, default and limit transactions.
- PostGIS `geography(Point,4326)` with correct lng/lat order everywhere; GIST indexes.
- Booking snapshot of address text and coordinates.
- Geofence based on worker device GPS.
- 42/42 unit tests pass.

**Broken:**
- Google geocoding and search (billing) — LOC-001.
- Quick-add coordinates — LOC-002.
- Notes persistence — LOC-004.
- Deleted address still bookable — LOC-006.
- Placeholder UUIDs — LOC-007.
- Custom-request current-location address — LOC-013.
- Forced default — LOC-014.

**Unreliable:**
- Indoor and approximate-permission location — LOC-012.
- OSM-bound address latency — LOC-009.
- Public Nominatim dependency — LOC-010.
- Fallback search — LOC-011.
- Backend trust outside production — LOC-008.
- Saved-id plus GPS mixing — LOC-016.

**Unnecessarily complicated:**
- Three client copies of the active address.
- Two "last location" caches.
- Three haversine implementations.
- Duplicate picker file.
- A three-tier client provider cascade that belongs on the server.

**Should be optimized:**
- Google-first instead of parallel-and-wait.
- Server cache.
- Place Details Essentials mask.
- Nearby query sub-selects.
- Places timeouts.

**Should be redesigned:**
- Address capture: pin-first with structured, editable fields and instructions.
- Geocoding and search through a backend proxy.
- Booking address trust: id-only from the client, everything else from the DB.

**Should remain untouched:** the items in "Working correctly" above (see doc 13 §4).

**Must be fixed before production:** roadmap Phase 0 (0.1–0.5) and Phase 1 items 1.1–1.3.

## Document index
| Doc | Content |
|---|---|
| 02 | As-built architecture, data-flow diagram, entry points, loss points |
| 03 | Frontend state, effects, race conditions, UX flow |
| 04 | Backend services, PostGIS, validation, geofence, worker payload |
| 05 | GPS accuracy engine, scenarios A–P, confidence strategy, device protocol |
| 06 | Geocoding providers, live results, last-meter, Pakistan address model |
| 07 | Map performance findings and measurement plan |
| 08 | Network/offline configuration and scenarios |
| 09 | Security & privacy |
| 10 | Request volume, scale model, cost levers |
| 11 | Scenario matrix (executed / code-proven / not tested) + test strategy |
| 12 | Bugs & risks register (34 items) |
| 13 | Target architecture |
| 14 | Roadmap with dependencies and acceptance criteria |

## Sources consulted for Google Maps Platform status
- Geocoding API release notes (SearchDestinations: Preview 28 Jan 2026, Experimental fields through Nov 2026): https://developers.google.com/maps/documentation/geocoding/release-notes
- Geocoding API v4 overview (GA / Preview / Experimental channels): https://developers.google.com/maps/documentation/geocoding/geocoding-v4-overview
- Places API usage & billing / Place Details (New) SKU fields: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing and https://developers.google.com/maps/billing-and-pricing/sku-details/places
