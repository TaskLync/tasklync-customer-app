# 12 — Bugs & Risks Register

Audit date: 2026-11-16 · Scope: customer app `develop` (working tree), `tasklync-backend` (`b246f00`), `tasklync-worker-app` (read-only).
No source code, schema, environment file or infrastructure was modified.

**Legend**
- **Type** — `BUG` = verified defect with a concrete failure path; `RISK` = weakness that becomes a defect under a stated condition.
- **Evidence** — `CODE` = read in source; `LIVE` = reproduced against a real service on 2026-11-16; `TEST` = executed unit test.
- Complexity S/M/L ≈ <1 day / 1–3 days / >3 days. Regression risk L/M/H.

---

## Summary

| ID | Sev | Type | Title |
|---|---|---|---|
| LOC-001 | P0 | BUG (LIVE) | Google Maps Platform project has billing disabled — Places (New), Places legacy, Geocoding forward & reverse all denied |
| LOC-002 | P0 | BUG (CODE) | Quick-add sheet saves a typed street with the coordinates of wherever the phone currently is |
| LOC-003 | P0* | RISK (CODE) | Single unrestrictable Maps key hard-coded in committed `app.config.ts` + `eas.json` and used for web-service calls from JS |
| LOC-004 | P1 | BUG (CODE) | Address notes (flat / gate / landmark) are never persisted; worker never receives them |
| LOC-005 | P1 | BUG (CODE) | Address text is not editable and has no structured fields (house, street, block, phase, landmark) |
| LOC-006 | P1 | BUG (CODE) | Deleting a saved address leaves it as the active/booking address |
| LOC-007 | P1 | BUG (CODE) | Shared placeholder `address_id` UUIDs sent to the backend when an address id is missing |
| LOC-008 | P1 | RISK (CODE) | Job-site verification only on in production; custom requests never verified; `address_text` never reconciled |
| LOC-009 | P1 | BUG (CODE) | Reverse geocoding backlog: aborted pin lookups still queue on the serialised OSM chain |
| LOC-010 | P1 | RISK (CODE+LIVE) | Production traffic depends on the public Nominatim server (usage-policy + availability) |
| LOC-011 | P1 | BUG (CODE+LIVE) | Search degrades to the native geocoder: suggestions are the user's own text and may resolve to an area centroid |
| LOC-012 | P1 | BUG (CODE) | Approximate-location permission / indoor users can never get a location; misleading guidance |
| LOC-013 | P1 | BUG (CODE) | Custom request "Current Location" creates a new default address whose text is just "<city>, Pakistan" |
| LOC-014 | P2 | BUG (CODE) | Every quick-added / auto-created address is forced to `is_default: true` |
| LOC-015 | P2 | BUG (CODE) | "Use current location" clears the selected saved address before GPS succeeds |
| LOC-016 | P2 | RISK (CODE) | Booking may pair a saved `address_id` with live-GPS coordinates |
| LOC-017 | P2 | RISK (CODE) | Persisted `selectedAddress` is never re-validated against the server list |
| LOC-018 | P2 | RISK (CODE) | No location-quality metadata (accuracy, source, age, pin-vs-GPS) stored with addresses or bookings |
| LOC-019 | P2 | RISK (CODE) | No GPS jump / outlier rejection between successive fixes |
| LOC-020 | P2 | UX (CODE) | Map picker shows no "you are here" dot / accuracy circle |
| LOC-021 | P2 | RISK (CODE) | iOS declares "Always" location usage text that claims background use |
| LOC-022 | P2 | RISK (CODE) | User-service address API accepts any world coordinate incl. (0,0); no service-area check |
| LOC-023 | P2 | RISK (CODE) | `user_addresses` base DDL is not in the repository migrations |
| LOC-024 | P2 | PERF (CODE) | Nearby-workers query runs 4 correlated sub-queries per candidate row |
| LOC-025 | P2 | BUG (CODE) | Custom-request form bypasses the service-area check in `__DEV__` and validator has no PK bbox |
| LOC-026 | P3 | BUG (CODE) | Place Details (New) city parser takes the *last* of locality/admin-2 (district wins) |
| LOC-027 | P3 | COST (CODE+DOC) | Place Details field mask includes `displayName` → billed at Pro instead of Essentials |
| LOC-028 | P3 | BUG (CODE) | GPS de-duplication lock ignores the second caller's options |
| LOC-029 | P3 | BUG (CODE) | `watchPositionAsync` hard-codes `mayShowUserSettingsDialog: true` |
| LOC-030 | P3 | RISK (CODE) | Mixed-language address text (geocoder language = device locale; OSM default Urdu) |
| LOC-031 | P3 | RISK (CODE) | Worker-app normaliser falls back to (0,0) when job-site coordinates are missing |
| LOC-032 | P3 | MAINT (CODE) | Duplicate / dead location code (3 haversines, identical picker files, unused sync API, 2 last-location caches) |
| LOC-033 | P3 | UX (CODE) | In-progress pin is lost if the picker is left or the app is killed; address saves are not queued offline |
| LOC-034 | P3 | RISK (NOT TESTED) | Center-pin tip alignment depends on icon geometry; not verified on device |

\* LOC-003 is P1 today only because billing is off (LOC-001). It becomes a P0 billing-exposure issue the moment billing is enabled, so it must ship together with the LOC-001 fix.

---

## P0 — Critical

### LOC-001 · Google Maps Platform billing disabled — every Google web-service call is denied
- **Problem.** The key configured for the app (same key in `.env`, `app.config.ts` fallback and all 4 `eas.json` profiles — verified by SHA-256 fingerprint, key never printed) belongs to a Cloud project whose billing is disabled.
- **Evidence (LIVE, 2026-11-16, replaying the app's own requests):**
  - `POST places.googleapis.com/v1/places:autocomplete` → **HTTP 403 `PERMISSION_DENIED` / `ACCESS_DENIED`** for all 7 test queries.
  - Legacy `place/autocomplete/json` → **`REQUEST_DENIED`: "You must enable Billing on the Google Cloud Project"** for all 7.
  - `geocode/json?latlng=` (reverse) and `geocode/json?address=` (forward) → **`REQUEST_DENIED`, same billing message**.
- **Root cause.** Cloud project configuration, not code. The code hides it: `places.service.ts:63-80` and `:100-103`, and `addressResolver.ts:97-103` swallow every non-OK answer and fall through silently.
- **Effective production behaviour today.**
  - Reverse geocoding = public Nominatim + native geocoder only (see LOC-009, LOC-010).
  - Search = native `Location.geocodeAsync` (LOC-011).
  - Each keystroke search makes 2 failing Google round-trips (≈230–1800 ms measured) before the native fallback.
  - **Map tiles:** Maps SDK for Android also requires an enabled billing account. A blank or grey map is likely but **NOT TESTED on a device**.
- **Customer impact.** Search shows no real places. Addresses are less accurate, and the map may not render on Android.
- **Fix.**
  1. Enable billing on the project (or move to a project with billing).
  2. Create separate keys (see LOC-003).
  3. Surface provider `REQUEST_DENIED`/403 to telemetry instead of swallowing it.
- **Complexity:** S (configuration) + S (telemetry). **Regression risk:** L.
- **Validation:** re-run `scripts/live-geocode-check.mjs` and the audit probe. Open the add-address map on a physical Android device and confirm tiles load.

### LOC-002 · Quick-add sheet binds a typed street to the phone's current GPS position
- **Files.** `src/components/address/AddAddressBottomSheet.tsx:70` (reads `liveLocation`), `:81-100`, `:102-117` (`open()` sets `coordsVerified=true` whenever a live fix is inside Faisalabad), `:248-304` (save posts `lat/lng` from that state).
- **Problem.** On open, the sheet silently copies the last live GPS fix into `lat/lng` and marks it verified. The customer then types any street ("House 12, St 4, Madina Town") and taps Save. The address is stored with the coordinates of where the phone was, with no map and no confirmation.
- **Reproduction.**
  1. Get a GPS fix at location A (any app screen that acquires GPS).
  2. Booking → Address → "Add new address".
  3. Type the street of location B and save.
  4. `POST /users/me/addresses` carries A's coordinates.
- **Root cause.** "Coordinates verified" is treated as "GPS fix exists" rather than "the user confirmed this point for this address".
- **Impact.**
  - Booking destination is wrong. `JobSiteService.resolve` (backend) forces the booking onto the saved, wrong coordinates.
  - The worker navigates to A.
  - Geofenced arrival at B fails, because `GEOFENCE_ARRIVE_RADIUS_METERS=200` is measured against A.
- **Fix.** Never attach coordinates to free-text entry. Route "Add new address" to the map picker (`/profile/addresses/add`), or require an explicit "Use my current location" tap, which already exists (`handleUseGPS`). The flag should only become true there.
- **Complexity:** S. **Regression risk:** L. **Validation:** unit-test the sheet state machine. Device test the A/B scenario.

### LOC-003 · Maps key committed and used from JS for web-service APIs (P0 once billing is on)
- **Files.**
  - `app.config.ts:3-6`: hard-coded fallback key literal.
  - `eas.json:13,22,32,40`: same key in every build profile.
  - `extra.googleMapsKey` exposes it at runtime (`app.config.ts:121`).
  - `addressResolver.ts:93-96`, `places.service.ts:37-43,84-86,184-194,219-223`: the key goes in URL/header from JS.
- **Problem.** The same key serves the Maps SDK for Android *and* Geocoding/Places web services. Web-service calls from `fetch` do not carry Android app signatures, so the key cannot carry an Android-app restriction without breaking geocoding. Any APK decompile, or a read of the git history, yields an unrestricted billable key.
- **Impact.** Unbounded third-party usage billed to Tasklync once billing is enabled. Quota exhaustion would take the app down.
- **Fix.**
  - Split into (a) a **Maps SDK key** restricted to the Android package + SHA-1 and the iOS bundle id, and (b) **no client web-service key**.
  - Proxy geocoding/places through the backend. A cached resolver already exists: `booking-service /address/resolve`, worker-only today.
  - Remove the literal from `app.config.ts`/`eas.json`, use EAS secrets, and rotate the leaked key.
- **Complexity:** M. **Regression risk:** M. **Validation:** a key-restriction test (call Geocoding with the SDK key → must be denied); `git grep AIza` returns nothing.

---

## P1 — High

### LOC-004 · Address notes / landmark instructions are silently dropped
- **Evidence chain.**
  1. UI collects notes: `AddressNotesInput.tsx:37`, placeholder "e.g. Flat 3B, blue gate, near the mosque". Passed in `AddressConfirmSheet.tsx:276` → `app/profile/addresses/add.tsx:390`.
  2. `useAddresses.ts:59-68` `addMutation.mutationFn` builds the request **without `notes` and `custom_label`**. Only the optimistic cache item keeps them (`:78,84`) until the refetch.
  3. `src/types/user.types.ts:68-76` `CreateAddressPayload` has no `notes`.
  4. The read mapper `useAddresses.ts:38-48` drops `notes`.
  5. Backend `user-service/src/validators/address.validator.ts:29-37` has no `notes`. zod strips unknown keys, and `AddressDTO` has no column. Update requests also lose it.
  6. Booking payload (`booking.types.ts:145-165`) has no address-notes field. The worker app only shows `description`.
- **Impact.** The last-meter information customers provide never reaches the worker. In Pakistani addressing (no house numbers on many streets, gated societies, plazas) this is the main way a worker finds the door.
- **Fix.**
  - Add `instructions` (and structured fields, see LOC-005) end-to-end: migration, validator, DTO, client types and mapper.
  - Snapshot them into the booking (`address_instructions` column), and display them in the worker app.
- **Complexity:** M. **Regression risk:** L.

### LOC-005 · Address text is geocoder output only; no structured / editable fields
- **Files.** `AddressConfirmSheet.tsx:273-281`: `address_line` comes from the reverse geocoder and has no input. The sheet's only `TextInput`s are the custom label and notes. The data model `address.types.ts:19-32` / `user_addresses` has only `address_line, city, country`.
- **Impact.** A customer whose pin resolves to "Satiana Road, Faisalabad" cannot add "House 123, Street 5, Block A, Phase 2". With Google denied (LOC-001), OSM often returns a road or neighbourhood, never a house. With nothing resolvable, `address_line` becomes "Location (31.41870, 73.07910)" (`addressResolver.ts:185-194`) and that is what the worker sees.
- **Fix.** Pin-first plus structured detail form: house/flat, street, block/phase/sector, society/area (prefilled from geocoder, editable), landmark, instructions. Keep geocoder text as `geocoded_address` for audit.
- **Complexity:** M–L. **Regression risk:** M.

### LOC-006 · Deleted address stays selected and is booked
- **Files.** `app/profile/addresses.tsx:84-92`: delete only calls `deleteAddress`. Contrast `app/profile/addresses/add.tsx:437-452`, which clears both stores. `location.store.ts:131-139` persists `selected_address` to MMKV. `bookingDraft.store.ts:92-95` persists the draft copy.
- **Reproduction.**
  1. Select address X for booking.
  2. Profile → Addresses → long-press X → Delete.
  3. Return to the cart and confirm the booking.
- **Result.**
  - Production (`ENFORCE_ADDRESS_OWNERSHIP` defaults to on): `404 ADDRESS_NOT_FOUND` at the final confirm step.
  - Non-production: the booking is created against a deleted address id with stale coordinates.
- **Fix.** Centralise "address removed" handling in `useAddresses` `onSuccess`: clear `selectedAddress`, booking draft and `lastPickedCoords` when ids match. Re-validate on hydrate (LOC-017).
- **Complexity:** S.

### LOC-007 · Placeholder address UUIDs sent to the backend
- **Files.**
  - `src/utils/uuid.ts:38-44` `CANONICAL_FALLBACK_UUIDS`.
  - `src/hooks/useCreateBooking.ts:164,195-198`: `ADDRESS_HOME` is used when address creation fails.
  - `src/services/api/booking.api.ts:442`: any non-UUID id is replaced with `ADDRESS_HOME`.
  - `src/hooks/custom-requests/useQuoteCheckout.ts:44,66,146`.
  - `app/custom-request/new.tsx:310-345`: a hard-coded UUID `4a7b5d2e-…` and a demo address "D-Ground, Peoples Colony No. 1" at the city-centre coordinates. This fallback is unreachable today because `handleSubmit` requires `selectedAddress`, but it ships in production code.
- **Impact.**
  - Booking path in production: fails late with `ADDRESS_NOT_FOUND`, a confusing error after a slot hold.
  - Custom-request path: the request is **stored** with a shared fake `address_id` and client coordinates (LOC-008).
- **Fix.** Delete the placeholder constants for addresses. If no valid owned address id exists, block with "Confirm your address on the map" before any network call.
- **Complexity:** S.

### LOC-008 · Job-site trust is partial on the backend
- **Files.**
  - `booking-service/src/services/job-site.service.ts:21-23`: verification is skipped when `config.security.enforceAddressOwnership` is false.
  - `src/config/index.ts:240`: `flag(env.ENFORCE_ADDRESS_OWNERSHIP, isProd)`, so staging/dev trust the client.
  - `custom-request.service.ts:246`: the custom request is created with client `latitude/longitude/address_id`, with no `JobSiteService` call.
  - `custom-request.validators.ts:10-13`: world range only.
  - `booking.service.ts:2494-2502`: quote acceptance verifies only when `dto.address_id` is present, otherwise it uses the unverified request coordinates.
  - `job-site.service.ts:35-42`: when coordinates are overridden (drift > 300 m), `address_text` from the client is kept, so text and coordinates can disagree.
- **Impact.**
  - Custom-request bookings carry unverified coordinates into the geofence (arrive/start/complete radii 200/150/500 m).
  - Staging does not exercise the production path.
- **Fix.**
  - Call `JobSiteService.resolve` in custom-request create.
  - Make the job site authoritative: load `address_line` together with the coordinates from `user_addresses`.
  - Enable the flag in staging.
- **Complexity:** S–M. **Regression risk:** M (needs contract tests).

### LOC-009 · Reverse-geocoding backlog on rapid pin moves
- **Files.**
  - `addressResolver.ts:226-235`: the shared lookup is started **without** the caller's signal: `resolveUncached(lat, lng)`.
  - `:175`: `Promise.all([fromGoogle, fromOsm])` waits for the slower provider.
  - `:107-142`: OSM calls are chained with ≥1.1 s spacing.
  - `useReverseGeocode.ts:91-113`: aborting only abandons the caller's *wait*.
- **Failure scenario.** The user drags the pin 5 times, ≥500 ms apart, so the debounce fires each time. Five uncached lookups enter the OSM chain. The 5th starts about 4.4 s after the 1st and completes after network time, so the final address appears **5–6 s** after the last drag. Measured public OSM latency is 1.3 s per call (LIVE). With Google denied (LOC-001), OSM is the only text source, so this is current behaviour. The UI correctly shows "Locating…" (latest-request-wins holds), but it is slow.
- **Fix.**
  - Drop queued OSM work whose callers have all aborted (reference-count the waiters).
  - Use Google-first with an OSM fallback rather than parallel-and-wait.
  - Move resolution server-side with a Redis cache (already implemented for workers).
- **Complexity:** M.

### LOC-010 · Production dependency on public Nominatim
- **Files.** `addressResolver.ts:32,54-58,119-127`: default `https://nominatim.openstreetmap.org`, `User-Agent: TaskLync-Customer-App`. Requests come from every customer device.
- **Risk.** The public instance's usage policy forbids heavy or app-scale use and requires an identifying UA. Abuse handling leads to 429/403 and IP or UA blocks. The code backs off 60 s per device (`:128-131`), but cannot prevent a block. Coordinates of every pin are sent to a third party without a processing agreement (privacy, see doc 09).
- **Fix.** A self-hosted or commercial Nominatim (`EXPO_PUBLIC_NOMINATIM_URL` already supported), or server-side only.
- **Complexity:** M (infrastructure).

### LOC-011 · Search falls back to the native geocoder with misleading suggestions
- **Files.**
  - `places.service.ts:112-130`: suggestions are `{primary_text: <user query>, secondary_text: "lat, lng"}`, and the query gets `", Faisalabad, Pakistan"` appended.
  - `usePlacesAutocomplete.ts:112-134`: when details fail, the *description* is forward-geocoded natively and pinned.
- **Impact (current, because of LOC-001).**
  - The user types "Near Allied Hospital" and sees their own words as the "result".
  - The first native hit may be a city or area centroid, and is pinned as if it were the place.
  - No confidence indicator is shown.
- **Fix.** When no real provider is available, say so ("Search unavailable — move the map to your location"). Never echo the query as a result. Show the result type (area or exact).
- **Complexity:** S.

### LOC-012 · Approximate-permission and indoor users cannot obtain a location
- **Files.**
  - `location.service.ts:43-47`: target 20 m, cut-off 35 m, 9 s.
  - `:338-362`: the best fix > 35 m is rejected as `LOW_ACCURACY`.
  - No reading of Android `permission.android.accuracy` / iOS reduced accuracy anywhere (`grep coarse` → 0 hits).
  - Onboarding uses 45 m (`location-permission.tsx:115-121`); the rest of the app uses 35 m.
- **Impact.**
  - Android 12+ "Approximate" grants yield about 2 km accuracy, so they *always* fail with "Weak GPS signal… move near a window", which is wrong guidance.
  - Indoor Wi-Fi fixes in Faisalabad buildings, typically 30–80 m (**NOT TESTED**), are rejected outright, not offered as an approximate start point.
- **Fix.** Use a confidence-tiered acceptance (doc 05). Detect the approximate grant and ask for precise access. Use an approximate fix to centre the map, never to save.
- **Complexity:** M.

### LOC-013 · Custom request "Current Location" creates a vague default address
- **Files.** `app/custom-request/new.tsx:192-200`: the street is `"${currentCity}, Pakistan"` and the id is `'current_loc'`. `:327-345`: because the id is not a UUID, `userApi.createAddress({address_line: street, is_default: true})` runs.
- **Impact.**
  - The worker receives "Faisalabad, Pakistan, Faisalabad" as `address_text`.
  - Each such request adds another saved address and steals the default (LOC-014). After 20, creation fails (`MAX_ADDRESSES_PER_USER`) and the placeholder UUID is used (LOC-007).
- **Fix.** Require a confirmed pin through the map picker. Reuse an existing saved address within 15 m (`findNearbySavedAddress`).
- **Complexity:** S.

---

## P2 — Medium

| ID | Problem & evidence | Impact | Fix (complexity) |
|---|---|---|---|
| LOC-014 | `AddAddressBottomSheet.tsx:303` and `useCreateBooking.ts:179` force `is_default: true`; `custom-request/new.tsx:337` does too. Backend `address.repository.ts:72-79` honours it. | Adding a one-off address silently replaces Home as default. | Default only when `addresses.length === 0` (as `add.tsx:391` already does). (S) |
| LOC-015 | `useLocation.ts:146-151` `refreshLocation` sets mode `gps` and `selectedAddress=null` **before** `getCurrentPosition(true)`. On failure it returns `null`. | A tap on "Use current location" indoors loses the chosen saved address. Discovery falls back to the hydrated, possibly days-old `currentLocation`. | Switch mode only after a successful fix. (S) |
| LOC-016 | `useCreateBooking.ts:132-133` `lat = address?.latitude ?? liveLocation?.lat` while `address_id` may be a saved address. | Booking carries saved id + GPS point. Backend corrects only if drift > 300 m (`JOB_SITE_TOLERANCE_METERS`) and only in prod. | Never mix sources: require the address object's own coordinates. (S) |
| LOC-017 | `location.store.ts:175-234` hydrates `selectedAddress` from MMKV and never reconciles it with `GET /users/me/addresses`. | Addresses edited or deleted on another device or by support stay active. | Reconcile after the first successful address query. (S) |
| LOC-018 | Saved addresses / bookings store no accuracy, source (`gps`/`pin`/`search`), fix age, or pin-to-GPS distance (`user_addresses`, `bookings` schema). | Cannot measure or debug wrong-destination reports. | Add metadata columns (doc 13). (M) |
| LOC-019 | `location.service.ts:222-291` keeps the best-accuracy sample but has no outlier test against the previous accepted fix. | A rare multipath jump with a small reported radius is accepted. | Reject fixes whose displacement exceeds k × combined accuracy within the window. (S) |
| LOC-020 | `AddressPickerMap.native.tsx:194` `showsUserLocation={false}`, and no accuracy circle. | The customer cannot see that the pin is 300 m from their real position. | Show a blue dot + radius, and a "pin is X m from you" hint. (S) |
| LOC-021 | `app.config.ts:30-31` declares `NSLocationAlwaysAndWhenInUseUsageDescription` "…even when the app is in background". No background API is used (`grep startLocationUpdates` → 0). | App Store review / privacy-label mismatch. | Remove the Always string, keep When-In-Use. (S) |
| LOC-022 | `user-service/src/validators/address.validator.ts:26-27` uses world range only. (0,0) and points outside Pakistan are accepted; the booking validator has `PAKISTAN_BBOX`. | Invalid coordinates can be saved and later fail at booking. | Add a finite, non-null-island, PK bbox check, plus a service-area policy. (S) |
| LOC-023 | `user-service/migrations/` contains only `003_hardening.sql`, which ALTERs `user_addresses`. The CREATE is not in the repo. | The schema cannot be rebuilt from source; environments may drift. | Commit the baseline DDL. (S) |
| LOC-024 | `worker-service/src/repositories/nearby.repository.ts:74-104` runs per-row sub-selects (categories, starting price, 2× availability). | Linear cost growth with candidates in radius. | Pre-aggregate / LATERAL with an indexed join; cache per geohash (doc 10). (M) |
| LOC-025 | `app/custom-request/new.tsx:288-293` skips the service-area error in `__DEV__`; `custom-request.validators.ts:12-13` world range. | Dev builds create out-of-area requests that prod would reject. | Same rules in all builds; PK bbox on the backend. (S) |

## P3 — Low

| ID | Problem & evidence | Fix |
|---|---|---|
| LOC-026 | `places.service.ts:199-204` loops all components and assigns `city` for *each* locality/admin-2 match. Google orders components specific→general, so admin-area-level-2 (district) overwrites the locality. The legacy path (`:234-236`) uses `find` (first match), which is inconsistent. Live confirmation NOT TESTED (LOC-001). | Prefer `locality`, then `postal_town`, then admin-2. |
| LOC-027 | `places.service.ts:185` field mask `id,displayName,formattedAddress,location,addressComponents`. Google docs: `displayName` triggers the **Pro** SKU, while `addressComponents/location/formattedAddress` are Essentials. Mixed → billed at Pro. | Drop `displayName` unless needed; use the prediction's `mainText`. |
| LOC-028 | `location.service.ts:129-131` returns the in-flight promise regardless of options (onboarding 45 m vs default 35 m; `mayShowUserSettingsDialog`). | Key the lock by options, or merge. |
| LOC-029 | `location.service.ts:304` passes `mayShowUserSettingsDialog: true` to the watcher, ignoring the option the add-screen sets to `false` (`add.tsx:187`). | Pass the option through. |
| LOC-030 | `addressResolver.ts:60-66,95,122` uses the device locale for both providers. LIVE: OSM with no language returns Urdu script ("…فیصل آباد…"). | Store a canonical English (or chosen) form and display a localized one. |
| LOC-031 | Worker app `src/api/booking.api.ts:136-149` falls back to `0` (Null Island) when `job_site_location` is absent. | Treat missing coordinates as an error state (no navigation button). |
| LOC-032 | 3 haversine implementations (`locationUtils.ts:13`, `utils/address.ts:63`, `addressSelect.ts:62`); `AddressPickerMap.tsx` is byte-identical to `.native.tsx`; `userApi.syncCurrentLocation` is unused; two "last location" persistences (`location.store` `current_location` + `localStorage.cacheLastLocation`). | Consolidate. |
| LOC-033 | `add.tsx:211-215` clears `lastPickedCoords` on unmount; no offline queue for address mutations (`queryClient.ts:46` `retry: 0`; `useOfflineQueue` not used by addresses). | Persist the draft pin; offer "Retry" with the pin preserved. |
| LOC-034 | Pin tip vs. map centre: `AddressPickerMap.native.tsx` `pinIconWrapper.marginBottom: 36` with a 34 px icon. The tip should sit on the centre, but this is NOT TESTED. At street zoom about 1 px ≈ 1.4 m. | Device screenshot test with the map centre marker. |
