# 02 — Fixed Issues Register

Source: `audits/location-address/12_BUGS_AND_RISKS_REGISTER.md` (34 issues). Status legend:
**Fixed** (code done + tests) · **Partial** (code done, external step remains) · **Deferred** (not changed; reason given) · **Not addressed**.

## Totals

| Severity | Issues | Fixed | Partial | Deferred / not addressed |
|---|---|---|---|---|
| P0 | 3 | 1 | 2 (external: billing, key rotation) | 0 |
| P1 | 10 | 9 | 1 (external: self-hosted OSM) | 0 |
| P2 | 12 | 11 | 0 | 1 (LOC-024) |
| P3 | 9 | 7 | 1 (LOC-032) | 1 (LOC-034, device-only) |
| **Total** | **34** | **28** | **4** | **2** |

Plus 6 issues found during implementation (NEW-01…06), all fixed.

## Register

| ID | Sev | Root cause | Fix | Files | Tests | Status |
|---|---|---|---|---|---|---|
| LOC-001 | P0 | Cloud project billing disabled; errors swallowed | Per-provider circuit breaker (a denied provider is tried once, then skipped 10 min); telemetry `provider_down`; backend geo proxy; honest "search limited" UI. **Enabling billing is external.** | `providerHealth.ts`, `places.service.ts`, `addressResolver.ts`, `geoProxy.ts`, `AddressSearchResultsList.tsx`, booking-service `places-proxy.service.ts` | `providerHealth.test.ts` (4), `places-proxy.service.test.ts` (breaker) | **Partial — external** |
| LOC-002 | P0 | Sheet copied any live GPS fix into a typed address | Coordinates attach only after an explicit GPS tap **and** confirmation ("Is the professional coming here?"); otherwise the user goes to the map | `AddAddressBottomSheet.tsx` | manual review; flow covered by `activeAddress` tests | **Fixed** |
| LOC-003 | P0* | Key literal committed + used for web services from JS | Literals removed from `app.config.ts` / `eas.json`; Geocoding/Places via server proxy; client direct path self-disables when the key is denied. **Rotation + restriction + EAS secret are external.** | `app.config.ts`, `eas.json`, `geoProxy.ts`, booking-service proxy | `git grep AIza` → only Firebase `google-services.json` | **Partial — external** |
| LOC-004 | P1 | Notes dropped by client mutation and backend schema | `instructions` end-to-end: migration 004, validator, DTO, repo, client mapper/body, booking snapshot (migration 018), worker app display | user-service, booking-service, `addressDetails.ts`, `useAddresses.ts`, worker `JobLocationSection.tsx` | `address.validator.test.ts`, `addressDetails.test.ts`, `job-site.service.test.ts`, worker `bookingJobSite.test.ts` | **Fixed** (needs migrations applied) |
| LOC-005 | P1 | Address text = geocoder only; no structured fields | Editable House/Flat/Shop, Street, Block/Phase, Society/Area (prefilled), Landmark, Directions; address line composed from them | `AddressDetailsFields.tsx`, `AddressConfirmSheet.tsx`, `addressDetails.ts`, migration 004 | `addressDetails.test.ts` (compose) | **Fixed** |
| LOC-006 | P1 | List delete didn't clear active/booking copies | `useAddresses` delete `onSuccess` clears `selectedAddress` + booking draft; list reconciliation on every fetch | `useAddresses.ts`, `activeAddress.ts` | `addressDetails.test.ts` (reconcile) | **Fixed** |
| LOC-007 | P1 | Shared placeholder address UUIDs / demo address | All removed; invalid id ⇒ "Confirm your address on the map" before any network call; `booking.api` throws instead of substituting | `useCreateBooking.ts`, `booking.api.ts`, `useQuoteCheckout.ts`, `custom-request/new.tsx`, `add.tsx` | `resolveBookingLocation` tests | **Fixed** |
| LOC-008 | P1 | Ownership check prod-only; custom requests unverified; text not reconciled | Enforcement on in every env except unit tests; `JobSiteService` used by custom-request create and quote acceptance (legacy-tolerant); saved point **and text** are authoritative | booking-service `config`, `job-site.service.ts`, `booking.service.ts`, `custom-request.service.ts` | `job-site.service.test.ts` (5) | **Fixed** |
| LOC-009 | P1 | Aborted lookups still ran through the serialised OSM queue | Refcounted shared requests (cancelled when nobody waits); OSM run checks the signal while queued; Google-first | `sharedRequest.ts`, `addressResolver.ts` | `sharedRequest.test.ts` (6) + simulation (doc 06) | **Fixed** |
| LOC-010 | P1 | Every device hits public Nominatim | Client OSM is now a fallback only (not on every lookup) and only when the proxy is unreachable; server Google-first; server already disables public OSM in prod. **Self-hosted OSM is infrastructure.** | `addressResolver.ts`, booking-service resolver | resolver tests | **Partial — external** |
| LOC-011 | P1 | Native fallback echoed the query as a "result" | Native hits resolved to a real area name and labelled "Approximate match — confirm on the map"; `approximate` flag drives sheet + banner warnings | `places.service.ts`, `usePlacesAutocomplete.ts`, `add.tsx`, `AddressConfirmSheet.tsx` | `placeParse.test.ts` (dedupe) | **Fixed** |
| LOC-012 | P1 | Approximate permission / indoor fixes always rejected | Permission precision detection; `APPROXIMATE_PERMISSION` error with an "Allow precise" upgrade; low-confidence fixes returned as `approximateLocation` that only centres the map (banner, never saved); battery-free last-known hint | `locationConfidence.ts`, `location.service.ts`, `UseMyLocationButton.tsx`, `add.tsx` | `locationConfidence.test.ts` (17) | **Fixed** (thresholds need device calibration) |
| LOC-013 | P1 | "Current Location" became a "<city>, Pakistan" default | GPS default removed; a saved, map-confirmed address is required | `custom-request/new.tsx` | `resolveBookingLocation` tests | **Fixed** |
| LOC-014 | P2 | Forced `is_default: true` | Default only for the first address | `AddAddressBottomSheet.tsx`, `useCreateBooking.ts` (auto-create removed), `new.tsx` | — | **Fixed** |
| LOC-015 | P2 | Mode switched before the GPS fix | Switch only after success | `useLocation.ts` | — | **Fixed** |
| LOC-016 | P2 | Saved id + live GPS coordinates | `resolveBookingLocation`: the address's own point or an error; the backend uses the saved point | `activeAddress.ts`, `useCreateBooking.ts`, `job-site.service.ts` | tests | **Fixed** |
| LOC-017 | P2 | Hydrated selection never re-validated | Reconcile on each address fetch (clear / refresh) | `useAddresses.ts`, `activeAddress.ts` | tests | **Fixed** |
| LOC-018 | P2 | No location quality metadata | `location_source`, `gps_accuracy_m`, `pin_shift_m`, `place_id`, `geocoded_address` | migration 004, `add.tsx`, `addressDetails.ts` | validator + mapper tests | **Fixed** |
| LOC-019 | P2 | No jump filter | Jump test (3σ of combined accuracy, ≥50 m, >30 m/s); outlier never settles alone; best *consistent* sample at timeout | `locationConfidence.ts`, `location.service.ts` | tests | **Fixed** |
| LOC-020 | P2 | No "you are here" | `showsUserLocation` when permitted + "Pin is X m from your current location" hint | `AddressPickerMap.native.tsx`, `add.tsx`, `AddressConfirmSheet.tsx` | — (UI) | **Fixed** |
| LOC-021 | P2 | iOS "Always" text | Removed via plugin `false` (verified against the installed plugin source) + infoPlist; background flags explicitly false | `app.config.ts` | `expo config` check: only `NSLocationWhenInUseUsageDescription` | **Fixed** |
| LOC-022 | P2 | Address API accepted any coordinate | finite + PK bbox (rejects 0,0 and out-of-country) | user-service validator | `address.validator.test.ts` | **Fixed** |
| LOC-023 | P2 | Baseline DDL missing | `000_baseline_user_addresses.sql` (IF NOT EXISTS) | user-service migrations | — (verify against prod schema) | **Fixed** |
| LOC-024 | P2 | Nearby correlated sub-queries | Not changed: needs `EXPLAIN ANALYZE` on real data; worker-matching regression risk | — | — | **Deferred** |
| LOC-025 | P2 | `__DEV__` bypass; world-range validator | Bypass removed; PK bbox on custom requests | `new.tsx`, `custom-request.validators.ts` | `agency-custom-service.test.ts` | **Fixed** |
| LOC-026 | P3 | District overwrote locality | `parsePlaceComponents` locality-first (client), `mapPlaceDetails` (server) | `placeParse.ts`, `places-proxy.service.ts` | both | **Fixed** |
| LOC-027 | P3 | `displayName` → Pro SKU | Essentials-only masks (client and server) | `places.service.ts`, `places-proxy.service.ts` | proxy test asserts mask | **Fixed** |
| LOC-028 | P3 | De-dup ignored options | In-flight map keyed by options | `location.service.ts` | — | **Fixed** |
| LOC-029 | P3 | Watcher forced settings dialog | Option passed through | `location.service.ts` | — | **Fixed** |
| LOC-030 | P3 | Device-locale address text | Canonical `en` (configurable `extra.geocodeLanguage`) for Google, OSM, Places | `addressResolver.ts`, `places.service.ts` | — | **Fixed** |
| LOC-031 | P3 | Worker (0,0) fallback | `normalizeJobSite` → undefined; navigation hidden; honest message | worker `booking.api.ts`, `detail.tsx`, `map.tsx`, `JobLocationSection.tsx` | `bookingJobSite.test.ts` (5) | **Fixed** |
| LOC-032 | P3 | Duplicate / dead code | Picker duplicate → re-export; dead `cacheLastLocation` writes removed. Three haversine helpers and unused `userApi.syncCurrentLocation` remain (low value, not worth the churn) | `AddressPickerMap.tsx`, `location.service.ts` | — | **Partial** |
| LOC-033 | P3 | Pin lost on exit / kill | Persisted draft (pin + details + label), restored for 30 min with a banner; cleared on save / explicit back | `location.store.ts`, `add.tsx`, `AddressConfirmSheet.tsx` | — (UI) | **Fixed** |
| LOC-034 | P3 | Pin tip alignment unverified | Needs a device screenshot test | — | NOT TESTED | **Not addressed** |

## Found during implementation

| ID | Problem | Fix | Status |
|---|---|---|---|
| NEW-01 | Confirm sheet showed **"Saved!" before the backend answered** (it set success on tap) | `onSaveAddress` resolves `true` only after the server confirms; failure keeps the form and the draft | Fixed |
| NEW-02 | Quote → booking fell back to `(0,0)` when request coordinates were missing (code path) | NaN + explicit `JOB_SITE_MISSING` error | Fixed |
| NEW-03 | `useQuoteCheckout` typed its address as `UserAddress` (wrong shape) → 11 standing TS errors | Correct local `CheckoutAddress` type | Fixed (11 pre-existing TS errors gone) |
| NEW-04 | user-service `tsconfig` had no `include` → any non-src file broke the build | `include: ["src/**/*"]` + `test` script | Fixed |
| NEW-05 | Server cached **Google** geocoding text for 30 days (Maps Platform terms restrict caching Google content) | Separate `ADDRESS_GOOGLE_CACHE_TTL_SECONDS` (default 0); OSM results still cached | Fixed — confirm against your Google agreement |
| NEW-06 | Opening the server resolver to customers would put every customer in ONE service-wide 1 req/s OSM queue | Server is now Google-first; OSM only for weak / missing Google answers | Fixed |
