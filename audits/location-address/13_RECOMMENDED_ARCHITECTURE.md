# 13 — Recommended Target Architecture

Principles:
- Keep what works: the GPS engine, the latest-request-wins hooks, the candidate ranking, the PostGIS model, booking snapshots and the geofence.
- Fix trust boundaries and the data model.
- Add **no new service**: the geocode proxy extends the existing booking-service `AddressResolverService` (Redis-cached, Google ∥ OSM, already written and tested), which today is worker-only.

## 1. Target flow

```mermaid
flowchart LR
  subgraph App
    GPS[acquireFreshGPSPosition<br/>+ jump filter + coarse detection] -->|confidence tier| MAP[Map picker<br/>blue dot + accuracy circle]
    MAP -->|confirmed pin| FORM[Address form<br/>prefilled structured fields<br/>house, street, block/phase, society,<br/>landmark, instructions]
    SEARCH[Search] -->|/geo/autocomplete| GW
    MAP -->|/geo/reverse (debounced, latest wins)| GW
    FORM -->|POST /users/me/addresses| GW
    BOOK[Booking] -->|address_id only| GW
  end
  GW[API Gateway<br/>auth + rate limit] --> GEO[geo proxy<br/>(booking-service AddressResolver, opened to customers)]
  GEO --> REDIS[(Redis cache<br/>~1 m cells, place details)]
  GEO --> GOOGLE[(Google: server key<br/>Geocoding + Places New, Essentials masks)]
  GEO -.fallback.-> OSMSELF[(self-hosted / commercial Nominatim)]
  GW --> USER[user-service] --> UA[(user_addresses<br/>+ structured fields, instructions,<br/>place_id, source, accuracy)]
  GW --> BSVC[booking-service] -->|JobSiteService ALWAYS<br/>coords + text + instructions from DB| BK[(bookings snapshot)]
  BK --> WORKER[Worker app<br/>instructions + entrance pin]
```

## 2. Component decisions

| Area | Decision | Why (evidence) |
|---|---|---|
| Keys | SDK keys app-restricted per platform; server-only web-service key; rotate the committed key | LOC-003 |
| Geocoding / search | Client calls the gateway `/geo/*`, never Google/OSM directly | key secrecy, shared cache, single telemetry point (LOC-001/009/010) |
| Provider order | Google first; OSM only on failure or no usable tier; native geocoder only offline | removes `Promise.all` latency + queue (LOC-009) |
| GPS acceptance | Confidence tiers (doc 05 §4); approximate grant → centre only + request precise | LOC-012/019 |
| Address capture | Pin-first everywhere; quick sheet becomes "choose saved / open map"; text fields editable, geocoder text kept as `geocoded_address` | LOC-002/005/013 |
| Data model | Add nullable columns (below) | LOC-004/005/018 |
| Booking trust | `JobSiteService.resolve` always on (all envs), also for custom requests; booking loads `address_line`, structured fields and instructions from DB; client sends only `address_id` | LOC-007/008/016 |
| Client state | One source: the TanStack query cache + `selectedAddressId`; the draft holds an id, not a copy; reconcile on hydrate and on mutation success | LOC-006/017 |
| Observability | Events: `location_acquire {outcome, radius, ms}`, `geocode {provider, tier, ms, cache_hit}`, `provider_denied`, `address_saved {source, accuracy, pin_shift_m}`, `geofence_fail {distance}` | currently blind (LOC-001) |
| Last metre | Optional entrance pin; evaluate Geocoding v4 SearchDestinations (Preview, experimental fields) behind a flag after a coverage study | doc 06 §3 |

## 3. Schema additions (backward compatible, all nullable)

```sql
-- user-service (sketch, not applied)
ALTER TABLE user_addresses
  ADD COLUMN house_unit       VARCHAR(50),
  ADD COLUMN street           VARCHAR(100),
  ADD COLUMN block_phase      VARCHAR(50),
  ADD COLUMN area             VARCHAR(100),   -- society / colony / town
  ADD COLUMN landmark         VARCHAR(150),
  ADD COLUMN instructions     VARCHAR(300),
  ADD COLUMN geocoded_address TEXT,
  ADD COLUMN place_id         VARCHAR(300),
  ADD COLUMN location_source  VARCHAR(20) CHECK (location_source IN ('gps_confirmed','pin_adjusted','search','manual')),
  ADD COLUMN gps_accuracy_m   REAL,
  ADD COLUMN pin_shift_m      REAL,
  ADD COLUMN entrance_location geography(Point,4326);
-- booking-service snapshot
ALTER TABLE bookings ADD COLUMN address_instructions VARCHAR(300), ADD COLUMN address_details JSONB;
```
Also commit the baseline `CREATE TABLE user_addresses` (LOC-023), and add validator checks: finite, not (0,0), PK bbox.

## 4. What stays untouched
- `acquireFreshGPSPosition` core loop (add tiers and a jump filter around it, do not rewrite it).
- `useReverseGeocode`, `usePlacesAutocomplete`, `requestGate`: correct concurrency semantics.
- `addressSelect.ts` ranking (move or duplicate server-side; it already exists there as `utils/address-select.ts`).
- user-service default/limit/ownership transactions; PostGIS geography 4326; GIST indexes; booking snapshot columns; geofence service.

## 5. New dependencies
None required. Redis, Postgres/PostGIS, the resolver and its tests already exist. A self-hosted Nominatim is infrastructure, not a code dependency, and is optional if Google + cache is sufficient. Decide after measuring the Google hit rate.
