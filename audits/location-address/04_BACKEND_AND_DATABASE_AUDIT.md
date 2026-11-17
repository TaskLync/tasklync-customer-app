# 04 — Backend & Database Audit

Repository: `D:\tasklync-backend\tasklync-backend` @ `b246f00`. Read-only. Backend `.env` files were **not** opened.

## 1. Saved addresses — user-service

| Concern | Finding | Evidence | Verdict |
|---|---|---|---|
| Routes | `GET/POST /me/addresses`, `PATCH/DELETE /me/addresses/:id`, `PATCH /me/addresses/:id/default`; all `requireAuth`; writes also `limiters.write` + `requireActiveAccount`; UUID param validation | `routes/v1/address.routes.ts:10-47` | ✅ |
| Ownership | Every query is scoped `WHERE id=$1 AND user_id=$2`; `user_id` from the auth token, never the body | `repositories/address.repository.ts:47-54,125-131,141-144,165-181` | ✅ no cross-user access path found |
| Coordinate type | `geography(Point,4326)` (typed by migration) | `migrations/003_hardening.sql:23-24` | ✅ |
| Write order | `ST_MakePoint($6=lng, $7=lat)` with comment | `address.repository.ts:85,93-94` | ✅ |
| Read | `ST_Y(location::geometry) AS lat, ST_X AS lng` → float8 → JSON number | `:5-8` | ✅ (client also coerces `Number()`) |
| Validation | lat ∈ [-90,90], lng ∈ [-180,180]; label ≤ 50; address_line ≤ 500; city/country ≤ 100; control chars rejected; lat/lng must be updated together | `validators/address.validator.ts` | ⚠ no (0,0), PK-bbox or service-area check (LOC-022) |
| Missing fields | No `notes/instructions`, `custom_label`, house/street/block, `place_id`, accuracy, source | validator + DTO | ❌ LOC-004/005/018 |
| Default address | Partial unique index `uq_user_addresses_one_default ON (user_id) WHERE is_default`; per-user `pg_advisory_xact_lock(hashtext('user_addresses:'+id))`; delete promotes newest | `003_hardening.sql:42-43`; repo `:30-32,61-100,137-158,161-184` | ✅ correct under concurrency |
| Limit | 20 addresses / user (409 `ADDRESS_LIMIT_REACHED`) | `services/address.service.ts:6,15-25` | ✅ (interacts with LOC-013) |
| PATCH semantics | `is_default:false` ignored on purpose; `is_default:true` goes through the atomic setDefault | `address.service.ts:27-39` | ✅ |
| Duplicates | No server-side duplicate detection (client warns at 15 m) | — | ⚠ P3 |
| Index | `idx_user_addresses_user (user_id, created_at DESC)`; no spatial index (none needed: no spatial queries on this table) | `003_hardening.sql:46-47` | ✅ |
| RLS | Enabled with no policies (service uses a direct role) | `003_hardening.sql:108` | ✅ defence in depth |
| Schema provenance | `CREATE TABLE user_addresses` not present in repo migrations | `migrations/` only has `003_hardening.sql` | ❌ LOC-023 |

## 2. Bookings — booking-service

| Concern | Finding | Evidence |
|---|---|---|
| Snapshot | `address_id UUID NOT NULL, address_text TEXT NOT NULL, job_site_location GEOGRAPHY(POINT,4326) NOT NULL` | `migrations/001_create_bookings_table.sql:60-63` |
| Index | `idx_bookings_job_site … USING GIST(job_site_location)` | `001…sql:112` |
| Create validation | `address_id` uuid; `address_text` 5–500; lat/lng inside `PAKISTAN_BBOX` (23.5–37.2, 60.8–77.9) | `validators/booking.validators.ts:30-33`, `utils/geo.utils.ts:20` |
| Ownership + coordinates | `JobSiteService.resolve`: address must belong to the user, else `404 ADDRESS_NOT_FOUND`. If client coordinates drift > `JOB_SITE_TOLERANCE_METERS` (300) from the saved point, the saved point wins (logged without coordinates) | `services/job-site.service.ts:15-44`, `config/index.ts:72` |
| Enforcement flag | `enforceAddressOwnership: flag(env.ENFORCE_ADDRESS_OWNERSHIP, isProd)`. **Off by default outside production** | `config/index.ts:56,240` |
| Text reconciliation | When coordinates are overridden, `address_text` remains the client's | `job-site.service.ts:35-42`; `booking.service.ts:534-535` |
| Idempotency | Duplicate submit (same user/worker/start) returns the existing PENDING booking; client sends `attempt_id` | `booking.service.ts:521-529`; client `useCreateBooking.ts:228-236` |
| Estimate endpoint | `estimateQuerySchema` defaults `latitude=31.5204, longitude=74.3587` (Lahore) when absent | `booking.validators.ts:60-61` — a pricing fallback, P3: demand pricing for an unknown location silently uses Lahore |

### Custom requests / quotes
- The table has the same snapshot columns and a GIST index (`009…sql:51-54,81`).
- The create path (`custom-request.service.ts:246`) persists client `address_id/latitude/longitude` **without** `JobSiteService` and with world-range validation only (`custom-request.validators.ts:10-13`) → LOC-008/025.
- Quote → booking (`booking.service.ts:2494-2502`) verifies only if `dto.address_id` is provided. Otherwise it uses the request's coordinates. The `: 0` fallback for missing `req_lat` is unreachable because the column is `NOT NULL`, but it should not exist.

## 3. Geofence (consumer of the customer location)
`GeofenceService` (`geofence.service.ts`) compares worker device GPS (Redis TTL 180 s → `worker_locations` with `source='GPS'`) against `job_site_location`:
- Radii: arrive 200 m, start 150 m, complete 500 m.
- Accuracy cap 100 m, telemetry age 120 s, tolerance cap 50 m.
- `GEOFENCE_REQUIRE_TELEMETRY=false` (`config/index.ts:61-70`).
- Manual (address-derived) worker points are excluded (`:43-44`). Good.

**Implication:** a customer pin that is more than about 150–200 m off (LOC-002, LOC-011, LOC-013) makes the worker's arrive/start actions fail or need an override. The customer-side location accuracy directly affects worker operations.

## 4. Worker-facing payload
- Booking DTO: `job_site_location: {lat,lng}` when present (`booking.repository.ts:569-573`).
- Worker app normaliser: `job_site_location.lat ?? latitude ?? lat ?? coordinates[1] ?? 0` (`tasklync-worker-app/src/api/booking.api.ts:136-149`). The `0` fallback is LOC-031.
- Navigation: `geo:`/`maps://`/Google Maps universal URL with destination coordinates (`worker-app/src/services/location/geospatial.service.ts:316-335`). It navigates to coordinates, not to text. This is correct, but it makes coordinate accuracy the single point of truth.
- The worker receives **no address instructions** (LOC-004).

## 5. Spatial query performance
- `worker-service nearby.repository.ts`: `ST_DWithin(wl.location, point::geography, radius)` on GIST `idx_worker_locations_geo`, using `ST_Distance` for ordering. Index-friendly.
- 4 correlated sub-selects per candidate (`:74-104`) → LOC-024. No `EXPLAIN` was run (no DB access): **NOT TESTED**.
- `booking.repository.ts:484,503`: `ST_Distance`/`ST_DWithin` on `worker_locations` for demand, with `$4=lng, $3=lat`. Correct order.

## 6. Redis / Kafka
- Redis: worker live location `worker:location:{id}` (TTL 180 s); booking-service address resolver cache per about 1 m cell (`address-resolver.service.ts:21`). The **customer app does not use the server resolver**: it is worker-only (`routes/address.routes.ts:22` `requireRole(WORKER)`).
- Kafka/outbox: `location.events` topic referenced in the outbox retry config (`011_round2_hardening.sql:30`). The search-service `jobs/location-sync.job.ts` syncs worker locations into search documents. Customer addresses are not published as events (none are needed).
- Cache invalidation for addresses: client `invalidateQueries(['user-addresses'])` after the last mutation (`useAddresses.ts:107-113`). The server does not cache addresses.

## 7. Backward compatibility
- The client tolerates DECIMAL-as-string coordinates (`Number()` coercion + finite filter, `useAddresses.ts:36-49`).
- Adding nullable columns (`instructions`, structured parts, `location_source`, `accuracy_m`) to `user_addresses` and `bookings` is backward compatible. Old clients ignore unknown response fields, and zod strips unknown request fields until the new validator ships.

## 8. Not tested
- Live database: no `EXPLAIN ANALYZE`, row counts or SRID scan were run. The SRID claim for `user_addresses` relies on the `003` migration `ALTER … TYPE geography(Point,4326)`, which fails on any non-point row.
- Backend Google key/billing state: the backend uses its own env key (not inspected).
- Load or concurrency tests against the APIs.
