# 04 — API & Database Changes

All changes are **additive and backward compatible**. Older app versions keep working. No production data was modified, and **no migration was executed**.

## 1. Database

### user-service
| Migration | What | Safe to re-run | Rollback |
|---|---|---|---|
| `000_baseline_user_addresses.sql` | `CREATE TABLE IF NOT EXISTS user_addresses (...)` + postgis/pgcrypto extensions | Yes (no-op on existing DBs) | n/a |
| `004_address_details.sql` | `ADD COLUMN IF NOT EXISTS` house_unit, street, block_phase, area, landmark, instructions, geocoded_address, place_id, location_source (CHECK), gps_accuracy_m, pin_shift_m (CHECK ≥ 0) | Yes | `DROP COLUMN …` (in the file header; loses data in those columns) |

Apply order: `000 → 003 → 004`.

The repository detects the columns at runtime (`information_schema`, once per process). The code can therefore be deployed **before** the migration (new fields are ignored) or after it.

### booking-service
| Migration | What |
|---|---|
| `018_booking_address_snapshot.sql` | `bookings` and `custom_service_requests`: `address_instructions VARCHAR(300) NULL`, `address_details JSONB NULL` |

Snapshot writes are skipped when the columns are absent. The quote query reads them via `to_jsonb(r)` so it works before and after 018.

### Unchanged (verified)
- `geography(Point, 4326)` everywhere, written as `ST_MakePoint(lng, lat)`.
- Existing GIST indexes.
- One-default partial unique index.
- Per-user advisory locks.

## 2. user-service API — `/api/v1/users/me/addresses`

Request (POST / PATCH), new optional fields:
```jsonc
{
  "label": "Home", "address_line": "House 123, Street 5, Block A, Madina Town, Faisalabad",
  "city": "Faisalabad", "lat": 31.4, "lng": 73.0,
  "house_unit": "House 123", "street": "Street 5", "block_phase": "Block A", "area": "Madina Town",
  "landmark": "Near University Gate", "instructions": "Blue gate, ring twice",
  "geocoded_address": "Madina Town, Faisalabad", "place_id": "…",
  "location_source": "gps_confirmed | pin_adjusted | search | manual",
  "gps_accuracy_m": 14.5, "pin_shift_m": 38
}
```

**Validation change (breaking only for invalid input):** `lat`/`lng` must be finite and inside the Pakistan bounding box (23.5–37.2, 60.8–77.9). `(0,0)` and foreign points now return 400. These were already unbookable (booking-service had the same bbox).

The response includes all new fields (null when unset or before migration 004).

## 3. booking-service API

### Geo proxy — `/api/v1/bookings/address/*` (authenticated; roles `user` and `worker`; rate limit `addressResolve` 90/min)
| Endpoint | Status | Notes |
|---|---|---|
| `GET /resolve?lat=&lng=` | **Opened to customers** | Google-first, OSM fallback; Google text not persisted by default |
| `POST /resolve-batch` | Opened to customers | unchanged |
| `GET /autocomplete?q=&session=` | **New** | Places API (New); `{ predictions:[{place_id, description, primary_text, secondary_text, types}], attribution:'google' }`; 503 `GEO_PROVIDER_UNAVAILABLE` when Google is unavailable |
| `GET /place/:placeId?session=` | **New** | Essentials mask `id,formattedAddress,location,addressComponents,types`; 404 `PLACE_NOT_FOUND`; 503 when unavailable |

### Bookings / custom requests
- `POST /bookings`: unchanged contract. **Behaviour change:** `latitude`/`longitude`/`address_text` are taken from the saved address of `address_id` (client values are ignored when verified). A foreign or unknown `address_id` → 404 `ADDRESS_NOT_FOUND`. This applies in **all environments** now (previously production only).
- `POST /custom-requests`: the same verification (new). Coordinates must be inside the PK bbox.
- `POST /bookings/from-quote`: address fields optional (they already were on the server); omitted → the request's own address is used (legacy requests with an unverifiable address keep their stored point). Missing coordinates → 422 `JOB_SITE_MISSING` (never `(0,0)`).
- Booking / custom-request responses add `address_instructions` and `address_details` (null when absent).

### New configuration (booking-service env)
| Variable | Default | Meaning |
|---|---|---|
| `ENFORCE_ADDRESS_OWNERSHIP` | on (off only when `NODE_ENV=test`) | was production-only |
| `ADDRESS_GOOGLE_CACHE_TTL_SECONDS` | `0` | Redis TTL for Google-sourced text (terms) |
| `ADDRESS_PLACES_TIMEOUT_MS` | `4000` | Places proxy timeout |
| `ADDRESS_BIAS_LAT` / `ADDRESS_BIAS_LNG` / `ADDRESS_BIAS_RADIUS_M` | Faisalabad centre / 35000 | autocomplete bias |
| `GOOGLE_MAPS_SERVER_KEY` | (existing) | server key; must be a **separate, IP-restricted** key |

## 4. Consumers updated
- **Customer app:** uses the proxy first, then direct providers (self-disabling), then the native geocoder; sends and reads the new fields.
- **Worker app:** reads `address_instructions` / `address_details`; tolerates a missing job site.
- **Admin app:** not inspected in this session. The new response fields are additive.
