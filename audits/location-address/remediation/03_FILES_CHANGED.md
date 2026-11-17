# 03 — Files Changed

Nothing was committed. All three repositories already had uncommitted work before this session; the lists below are **only the files changed by this remediation**. Pre-existing modifications are not included (e.g. customer-app `AddressCard.tsx`, `AddressLabelChips.tsx`, `MiniMapPreview.tsx`, `MapErrorBoundary.tsx` and `AddNewAddressRow.tsx` show as modified but were not touched here).

## Customer app — `D:\tasklync-customer-app\tasklync-customer-app`

### New
| File | Purpose |
|---|---|
| `src/utils/locationConfidence.ts` | Permission precision, fix tiers per use case, jump filter, best-consistent-sample, pin shift |
| `src/utils/sharedRequest.ts` | Shared, refcount-cancellable requests (LOC-009) |
| `src/utils/placeParse.ts` | Locality-first component parsing, prediction de-dupe (LOC-026) |
| `src/utils/addressDetails.ts` | Structured details, address-line composition, provenance, server mapper/body (LOC-004/005/018) |
| `src/utils/activeAddress.ts` | Reconcile active address, booking copy, `resolveBookingLocation` (LOC-006/007/016/017) |
| `src/services/maps/providerHealth.ts` | Per-provider circuit breaker (LOC-001) |
| `src/services/maps/geoProxy.ts` | Client for the backend geo proxy (LOC-003/010) |
| `src/services/location/locationTelemetry.ts` | In-process location events and timings (no coordinates) |
| `src/components/address/AddressDetailsFields.tsx` | House / street / block / area / landmark / directions inputs |
| `__tests__/location/locationConfidence.test.ts` | 17 tests |
| `__tests__/address/providerHealth.test.ts` | 4 tests |
| `__tests__/address/placeParse.test.ts` | 4 tests |
| `__tests__/address/sharedRequest.test.ts` | 6 tests |
| `__tests__/address/addressDetails.test.ts` | 15 tests |
| `audits/location-address/remediation/*` | These deliverables |

### Modified
| File | Change |
|---|---|
| `src/services/location/location.service.ts` | Precision-aware, jump-aware acquisition; option-keyed de-dupe; dialog option honoured; `getMapCentreHint`; approximate fixes returned separately; dead cache writes removed |
| `src/services/maps/addressResolver.ts` | Proxy → Google → OSM (fallback only) → native → coordinates; cancellable shared lookups; breakers; English text; telemetry |
| `src/services/maps/places.service.ts` | Proxy first; breakers; timeouts; Essentials field mask; honest approximate fallback; locality-first city |
| `src/hooks/useLocation.ts` | `refreshLocation` switches mode only after success |
| `src/hooks/useCurrentLocation.ts` | `precision` in permission state |
| `src/hooks/usePlacesAutocomplete.ts` | Abortable details; approximate flag; `isDegraded` |
| `src/hooks/useAddresses.ts` | Mapper (no fabricated ids, details kept); full request body; server-confirmed create; delete/fetch reconciliation |
| `src/hooks/useCreateBooking.ts` | One saved address + its own point; no auto-create, no placeholder id, no GPS mix |
| `src/hooks/custom-requests/useQuoteCheckout.ts` | No placeholder id / fabricated coordinates; request location booked server-side; correct type |
| `src/services/api/booking.api.ts` | Throws on invalid address id; job site never fabricated; `address_instructions` |
| `src/store/location.store.ts` | Persisted `addressDraft` (30-min restore) |
| `src/types/{address,location,booking,customRequest,user}.types.ts` | Detail fields, precision, approximate, optional job site, optional quote address |
| `src/components/address/AddressConfirmSheet.tsx` | Structured fields, area prefill, approximate warning, pin hint, attribution, success only after confirmation |
| `src/components/address/AddressNotesInput.tsx` | Generic labelled input (directions default, 300 chars) |
| `src/components/address/AddAddressBottomSheet.tsx` | No silent GPS coordinates; explicit confirmation; no local ids; no forced default |
| `src/components/address/UseMyLocationButton.tsx` | Approximate permission upgrade; approximate centring callback |
| `src/components/address/AddressPickerMap.native.tsx` | Blue dot when permitted; map-load-timeout overlay; loading indicator on Android |
| `src/components/address/AddressPickerMap.tsx` | Now a re-export (was a byte-identical copy) |
| `src/components/address/AddressPickerMap.web.tsx` | Prop parity |
| `src/components/address/AddressSearchResultsList.tsx` | "Powered by Google" / limited-search notice |
| `app/profile/addresses/add.tsx` | Provenance, approximate banner, pin hint, draft restore, server-confirmed save |
| `app/custom-request/new.tsx` | Saved address required; demo / placeholder / dev bypass removed |
| `app/(auth)/location-permission.tsx` | Verified fix stored as live |
| `app.config.ts` | Key literal removed; When-In-Use only |
| `eas.json` | Key literals removed |

## Backend — `D:\tasklync-backend\tasklync-backend`

| File | Change |
|---|---|
| `services/user-service/migrations/000_baseline_user_addresses.sql` (new) | Baseline DDL, IF NOT EXISTS |
| `services/user-service/migrations/004_address_details.sql` (new) | 11 nullable columns + CHECKs |
| `services/user-service/src/validators/address.validator.ts` | Detail fields, PK bbox, finite |
| `services/user-service/src/dtos/address.dto.ts` | Detail fields |
| `services/user-service/src/repositories/address.repository.ts` | Column-aware SELECT/INSERT/UPDATE (works before and after 004) |
| `services/user-service/tests/address.validator.test.ts` (new) | 7 tests |
| `services/user-service/package.json`, `tsconfig.json` | `test` script; `include: src` |
| `services/booking-service/migrations/018_booking_address_snapshot.sql` (new) | Snapshot columns on bookings + custom requests |
| `services/booking-service/src/services/places-proxy.service.ts` (new) | Places (New) proxy |
| `services/booking-service/src/repositories/address-snapshot.repository.ts` (new) | Column-aware snapshot writer/reader |
| `services/booking-service/src/services/job-site.service.ts` | Saved point + text + directions authoritative; `allowMissing` |
| `services/booking-service/src/services/booking.service.ts` | Uses saved text; snapshots; quote path verified, no (0,0) |
| `services/booking-service/src/services/custom-request.service.ts` | Job-site verification + snapshot |
| `services/booking-service/src/services/address-resolver.service.ts` | Google-first; Google cache TTL separate |
| `services/booking-service/src/controllers/address.controller.ts` | autocomplete / place endpoints |
| `services/booking-service/src/routes/address.routes.ts` | Customers allowed; new routes |
| `services/booking-service/src/config/index.ts` | Enforcement default on; new geo settings |
| `services/booking-service/src/repositories/{booking,custom-request}.repository.ts` | Expose snapshot |
| `services/booking-service/src/types/index.ts` | Snapshot fields |
| `services/booking-service/src/validators/custom-request.validators.ts` | PK bbox |
| `services/booking-service/tests/unit/services/{job-site,places-proxy}.service.test.ts` (new) | 7 + 10 tests |
| `services/booking-service/tests/unit/services/address-resolver.service.test.ts` | Google-first expectations (+2 tests) |
| `services/booking-service/tests/unit/services/agency-custom-service.test.ts` | Fixture moved inside PK bbox |

## Worker app — `D:\tasklync-worker\tasklync-worker-app`

| File | Change |
|---|---|
| `src/api/booking.api.ts` | `normalizeJobSite` (no 0,0); directions + details mapped |
| `src/types/booking.types.ts` | Optional job site; directions / details |
| `src/components/orders/JobLocationSection.tsx` | Shows landmark + directions; no navigation without a point |
| `src/app/order/[id]/detail.tsx`, `map.tsx` | Guard navigation; pass directions |
| `__tests__/api/bookingJobSite.test.ts` (new) | 5 tests |
