# 07 — Remaining Issues & Risks

## A. External configuration required (cannot be done from code)

| # | Item | Why | Owner action |
|---|---|---|---|
| E1 | **Enable billing** on the Google Cloud project (LOC-001) | Every Google web service was denied live (403 / REQUEST_DENIED). The code now degrades honestly, but search quality stays at "approximate area" until this is done. Android map tiles likely affected (not device-tested). | Cloud Console → Billing → link an account; set budget alerts and per-API quotas |
| E2 | **Rotate the committed Maps key** (LOC-003) | It remains in git history | Create new keys; delete the old one |
| E3 | **Split keys** | One key cannot be safely used for both the SDK and web services | (a) Android SDK key restricted to package `com.tasklync.user` + SHA-1, API = Maps SDK for Android; (b) iOS SDK key restricted to bundle `com.tasklync.user`; (c) server key restricted to backend egress IPs, APIs = Geocoding + Places (New) → `GOOGLE_MAPS_SERVER_KEY` |
| E4 | **EAS environment variable** `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Removed from `eas.json`; builds need it from EAS | `eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_KEY --value <sdk-key> --environment production` (repeat for preview/development), or an EAS project secret |
| E5 | **Apply migrations** user-service `000`, `004`; booking-service `018` | Directions / structured details are only stored once applied (code tolerates their absence) | See `08_DEPLOYMENT_AND_ROLLBACK_GUIDE.md` |
| E6 | **OSM geocoder for production** (LOC-010) | Public Nominatim is disabled server-side in production and is not for app-scale use | Self-host or buy a commercial Nominatim; set `NOMINATIM_BASE_URL` (server) / `EXPO_PUBLIC_NOMINATIM_URL` (client fallback) |
| E7 | **Google caching terms** (NEW-05) | Server Google-sourced cache TTL is now 0 by default | Confirm what your Google agreement allows before raising `ADDRESS_GOOGLE_CACHE_TTL_SECONDS` |
| E8 | **Firebase key** in `google-services.json` | Normal for Firebase, but should be restricted | Restrict it to the Android app in Cloud Console |
| E9 | **Privacy policy** | Pins are processed by Google (and OSM when used) | Disclose; DPA if self-hosting is not used |

## B. Not done in code

| ID | Item | Reason | Next step |
|---|---|---|---|
| LOC-024 | Nearby-workers query sub-selects | Needs `EXPLAIN ANALYZE` on real data; rewriting worker matching blind risks a regression the prompt forbids | Capture plans at realistic volumes, then rewrite with LATERAL + a geohash result cache |
| LOC-032 | 3 haversine helpers; unused `userApi.syncCurrentLocation` | Cosmetic; churn across many call sites for no behaviour change | Fold into `locationConfidence.distanceM` opportunistically |
| LOC-034 | Pin tip vs map centre | Needs a device screenshot test | Maestro screenshot with the centre crosshair |
| — | Entrance / gate as a separate point; Geocoding v4 SearchDestinations | SearchDestinations is Preview with Experimental fields (Google release notes, 2026); PK coverage unknown. Today the confirmed pin is explicitly "the gate or door the professional should come to", plus landmark and directions | Coverage study on 50 Faisalabad addresses once billing is on |
| — | Live re-test of the 7 Pakistani inputs | Google denied | Re-run the audit probe after E1 |

## C. Not tested (requires devices / environments)
- Every GPS scenario A–P (doc 05) on Android low-end, Android 14 and iOS. **The thresholds (20/35/150 m, jump 3σ/50 m) must be calibrated there.**
- Map tiles with and without billing; the new 12 s "Map couldn't load" overlay.
- Offline, throttled and DNS-failure flows end to end (unit-level logic is tested).
- Database integration: migrations 000/004/018 on a PostGIS instance; column-detection paths against a real catalog.
- Load tests (k6) for the opened geo proxy (rate limiter 90/min per user).
- Admin app consumers of the new booking fields (not inspected).

## D. Residual risks introduced by this change
| Risk | Mitigation |
|---|---|
| Ownership enforcement is now on in staging/dev: test data with fake address ids will be rejected (404 `ADDRESS_NOT_FOUND`) | Intended (staging matches prod). Opt out per environment with `ENFORCE_ADDRESS_OWNERSHIP=false` if needed |
| Saved-address coordinates now must be inside Pakistan | Same bbox bookings already enforced. Existing rows are unaffected (write-time validation only) |
| Booking text now comes from the saved address, not the client copy | Same source the customer saved; covered by `job-site.service.test.ts` |
| Picker draft restore could surprise a user who left via the hardware back gesture (not the on-screen back button) | Draft expires after 30 min and shows a "Restored your unsaved pin" banner; saving or the on-screen back clears it |
| Worker suites that cannot run (`@testing-library/react-native` not installed) | Pre-existing; install the dev dependency to run them |
