# 08 — Deployment & Rollback Guide

Nothing has been committed, deployed or migrated. **Take a verified database backup before any migration.**

## Order of operations

### 0. Google Cloud (external, first)
1. Enable billing; add budget alerts and quotas (Geocoding, Places (New)).
2. Create three keys: Android SDK (package + SHA-1), iOS SDK (bundle id), server (IP-restricted; Geocoding + Places (New)).
3. Revoke the previously committed key once new builds are out.

### 1. Database (backward compatible; any order relative to code)
```bash
# user-service (shared Postgres)
psql "$DATABASE_URL" -f services/user-service/migrations/000_baseline_user_addresses.sql
psql "$DATABASE_URL" -f services/user-service/migrations/004_address_details.sql
# booking-service (its runner picks up 018, or apply directly)
psql "$DATABASE_URL" -f services/booking-service/migrations/018_booking_address_snapshot.sql
```
Verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_addresses' AND column_name IN ('instructions','house_unit','location_source');
SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name IN ('address_instructions','address_details');
```
Services cache column detection per process. **Restart user-service and booking-service after the migrations** so the new columns are used.

### 2. Backend
- booking-service env: `GOOGLE_MAPS_SERVER_KEY=<server key>`; optional `ADDRESS_GOOGLE_CACHE_TTL_SECONDS` (default 0), `ADDRESS_BIAS_*`, `NOMINATIM_BASE_URL` (self-hosted).
- `ENFORCE_ADDRESS_OWNERSHIP` now defaults to on in every non-test environment. Leave it unset (on). Set `false` only for a deliberate local-dev exception.
- Deploy user-service, then booking-service. Smoke tests:
  - `GET /api/v1/bookings/address/autocomplete?q=Madina` with a **customer** token → 200 with predictions (503 `GEO_PROVIDER_UNAVAILABLE` means the server key/billing is not ready; the app still works on its fallback).
  - `POST /api/v1/users/me/addresses` with `instructions` → response echoes it.
  - Create a booking → response has `address_instructions`.

### 3. Mobile builds
- EAS: set `EXPO_PUBLIC_GOOGLE_MAPS_KEY` per environment (SDK key, **not** the server key).
- Customer app: build and test on a physical Android device (map tiles, GPS, picker, save offline → retry). Then iOS (When-In-Use prompt only).
- Worker app: release with the job-location changes (directions shown; no navigation without a point).
- The customer app works against an **old backend** too: the old resolver route answers 403 to customer tokens (worker-only) and the new routes 404. Either trips the proxy breaker (10–30 min), so the app uses direct providers / the native fallback without a per-lookup round trip. New address fields are ignored until migration 004.

### Acceptance checks (release gate)
1. Pick a pin indoors → "Approximate location (±R m)" banner; the pin does not claim GPS precision.
2. Approximate permission → "Precise location is off" → Allow precise works (Android 12+).
3. Add an address with house/street/landmark/directions → reopen in edit → all fields present → book → the worker sees landmark + directions.
4. Delete the selected address from the list → booking asks for an address (no 404 at confirm).
5. Quick-add sheet: type a street without GPS → sent to the map. With GPS → confirmation dialog.
6. Airplane mode, then save → "Address not saved…" and the form is kept; reconnect → save succeeds; no duplicate.
7. Kill the app mid-pick → reopen Add Address → pin and details restored with a banner.

## Rollback

| Layer | Rollback | Data impact |
|---|---|---|
| Customer app | Ship the previous build / revert the commit | None (new fields simply ignored by the old app) |
| Worker app | Previous build | None |
| booking-service code | Redeploy the previous image | New snapshot columns stay unused. **Note:** the old code restores production-only enforcement and parallel Google+OSM |
| user-service code | Redeploy the previous image | New columns ignored. The old validator strips the new fields on later edits (stored values remain) |
| Migration 018 | `ALTER TABLE bookings DROP COLUMN address_instructions, DROP COLUMN address_details;` (and the same for `custom_service_requests`) | Loses snapshots |
| Migration 004 | `DROP COLUMN …` list in the file header | Loses entered details / directions |
| Migration 000 | Not needed (no-op on existing DBs) | — |
| Keys | Do **not** restore the leaked key; issue new restricted keys | — |

Roll back code before migrations, never the reverse.
