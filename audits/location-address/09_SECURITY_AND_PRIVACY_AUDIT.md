# 09 — Security & Privacy Audit (location scope)

No key, token or customer coordinate is reproduced in this report. Key identity was compared with SHA-256 fingerprints only.

| # | Topic | Finding | Evidence | Severity |
|---|---|---|---|---|
| S1 | **Maps API key in source** | One key literal in `app.config.ts:3-6` (fallback) and `eas.json:13,22,32,40`; identical to `.env` (gitignored). Committed to git history. | fingerprint match ×6 | **P0 when billing is on** (LOC-003) |
| S2 | **Key used for web services from the client** | Geocoding/Places called with `?key=` / `X-Goog-Api-Key` from JS; an Android-app restriction cannot be applied to these calls, so the key is effectively unrestricted. | `addressResolver.ts:93-96`; `places.service.ts:42,86,192,223` | P0/P1 (LOC-003) |
| S3 | Key exposed at runtime | `extra.googleMapsKey` is in the JS bundle and manifest | `app.config.ts:121` | part of S1 |
| S4 | Permission scope | Foreground only on Android (`ACCESS_COARSE/FINE`), no background API used ✅. iOS declares an "Always" description claiming background use ❌ | `app.config.ts:30-31,68-70,85-88` | P2 (LOC-021) |
| S5 | Third-party disclosure | Every pin coordinate is sent from the device to public Nominatim (OSMF servers), plus Google. Not covered by a DPA; must appear in the privacy policy | `addressResolver.ts:119-127` | P1 (LOC-010) |
| S6 | Backend authorization | Address CRUD scoped by `user_id` from JWT ✅; booking job-site ownership enforced **in prod only**; custom requests not enforced | user-service repo; `job-site.service.ts:21`; `custom-request.service.ts:246` | P1 (LOC-008) |
| S7 | Unauthorized address modification | Not possible across users (scoped queries, UUID param validation, write rate limit) ✅ | `address.routes.ts` | — |
| S8 | Logging | Client logs error objects only (`console.warn`), no coordinates. Backend job-site drift log contains `userId`, `addressId`, `driftMeters`, no coordinates ✅ | `location.service.ts:318,392`; `job-site.service.ts:36-40` | — |
| S9 | Local storage | Last location, current address, selected address, recent searches stored **unencrypted** in MMKV (`tasklync_location_storage`, default MMKV instance). Readable on rooted devices / backups | `location.store.ts:6,88,116,133,157` | P3 — consider an MMKV encryption key in SecureStore; clear on logout (verify) |
| S10 | Logout hygiene | Not verified whether the location store and booking draft are cleared on logout. **NOT TESTED** | — | check |
| S11 | Mock location | Rejected on Android by default; iOS undetectable via expo-location. Backend geofence uses worker `is_mocked` + accuracy caps ✅ | `location.service.ts:244-249`; `booking.validators.ts:132-137` | P3 |
| S12 | Data retention | No TTL on saved addresses (expected); no documented retention for `worker_locations`/booking coordinates. RLS enabled on `user_addresses` ✅ | `003_hardening.sql:108` | P3 (policy) |
| S13 | Client-side service-area bypass | `__DEV__` bypass in custom requests | `custom-request/new.tsx:288-293` | P2 (LOC-025) |

## Required actions
1. **Before enabling billing:**
   - Create `maps-sdk-android` and `maps-sdk-ios` keys with app restrictions (package + SHA-1 / bundle id) and API restrictions limited to the Maps SDKs.
   - Create a **server-only** key (IP-restricted to the backend) for Geocoding and Places.
   - Rotate the committed key.
   - Remove the literals from `app.config.ts`/`eas.json`; inject via EAS secrets.
   - Set per-API quotas and budget alerts.
2. Proxy customer geocoding and search through the gateway (authenticated, rate-limited, cached). The worker-only resolver already exists in booking-service.
3. Remove the iOS "Always" string.
4. Update the privacy policy for OSM/Google processing, or self-host Nominatim.
5. Turn on `ENFORCE_ADDRESS_OWNERSHIP` in staging; add `JobSiteService` to custom requests.
