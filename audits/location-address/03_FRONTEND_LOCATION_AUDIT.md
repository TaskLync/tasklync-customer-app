# 03 — Frontend Location Audit (customer app)

Files reviewed in full: `location.service.ts`, `currentAddress.ts`, `useLocation.ts`, `useCurrentLocation.ts`, `location.store.ts`, `location.types.ts`, `locationUtils.ts`, `addressResolver.ts`, `geocoding.service.ts`, `places.service.ts`, `geocodeParse.ts`, `addressSelect.ts`, `useReverseGeocode.ts`, `usePlacesAutocomplete.ts`, `useMapCamera.ts`, `useAddresses.ts`, `address.types.ts`, `utils/address.ts`, `requestGate.ts`, `serviceArea.config.ts`, `AddressPickerMap.native.tsx`, `app/profile/addresses/add.tsx`, `AddAddressBottomSheet.tsx`. Targeted reads: `AddressConfirmSheet.tsx`, `useCreateBooking.ts`, `booking.api.ts`, `bookingDraft.store.ts`, `app/booking/address.tsx`, `app/profile/addresses.tsx`, `AddressList.tsx`, `app/custom-request/new.tsx`, `location-permission.tsx`, `LocationSelectSheet.tsx`, `UseMyLocationButton.tsx`, `live-map.tsx`, `MapCanvas.tsx`, `WorkerMarker.tsx`, `queryClient.ts`, `app.config.ts`, `eas.json`.

## 1. State management

**Good**
- Fine-grained Zustand selectors (`useLocation.ts:19-27`). Setters are no-ops when the value is unchanged (`location.store.ts:64-74,123-128`).
- `liveLocation` vs hydrated `currentLocation` is an explicit, documented split (`location.store.ts:18-30`). The picker and booking use `liveLocation` only (`add.tsx:73-75`, `AddAddressBottomSheet.tsx:69-70`).
- Address text is stored together with the coordinates it was resolved for, and is only shown when within 30 m of the active point (`currentAddress.ts:10-16`). This prevents a "stale address under a new position".

**Problems**
- Three unsynchronised copies of the active address: `selectedAddress`, booking draft, query cache. This causes LOC-006 and LOC-017.
- `refreshLocation` mutates mode and selection before the async fix succeeds (LOC-015).
- `useAddresses` read mapper fabricates ids (`id: addr.id || generateUUID()`, `useAddresses.ts:40`) and drops `notes`/`custom_label` (LOC-004).
- The store is hydrated in a parent `useEffect` (`AuthProvider.tsx:28-34`), which runs *after* child effects such as `HomeHeader → useLocation` mount effects. This is harmless today because `checkAndSync` awaits a permission check before reading the store. It is still an ordering hazard: any future synchronous read in a child effect sees defaults. **Risk, not bug.**

## 2. Effects, closures, lifecycle

| Hook / screen | Observation | Verdict |
|---|---|---|
| `useLocation` mount effect `:215-258` | Re-subscribes `AppState` when `getCurrentPosition` identity changes (`enableHighAccuracy` dep). On foreground it re-checks only when permission ≠ granted or location missing, so revocation while running is detected only through that branch. | OK; revocation detection is partial (see doc 05 L). |
| `useLocation` address effect `:206-212` | Keyed on primitive lat/lng; resolver dedupes. | OK |
| Multiple `useLocation({autoFetch:true})` instances (HomeHeader, live-map) | Each has its own `hasAutoFetchedRef`. Concurrent hardware use is collapsed by `activeFreshPositionPromise`/`activeLegacyPositionPromise`. | OK (no duplicate GPS sessions) |
| `useCurrentLocation` | `isMountedRef` guards all `setState`s. | OK |
| `add.tsx` init effect `:133-177` | Waits for the edit address to load; `hasInitializedRef` prevents re-init. | OK |
| `add.tsx` silent GPS refresh `:181-208` | `cancelled` flag; respects `userInteractedRef`; programmatic camera moves are excluded via `programmaticUntilRef` (+1.5 s). | Good design. However, the `mayShowUserSettingsDialog:false` intent is lost in the watcher (LOC-029). |
| `useReverseGeocode` | Debounce 500 ms; `AbortController`; request gate; `isLoading` true from the moment the pin moves; `setResult` cancels pending lookups. | **Correct latest-request-wins.** Backlog issue is in the resolver (LOC-009). |
| `usePlacesAutocomplete` | Debounce 350 ms; separate gates for search and select; abort on new keystroke; session token reused across autocomplete + details, then discarded. | Correct. Session token ends only on select/reset; abandoned sessions are billed per request by Google (expected behaviour). |

## 3. Race condition: rapid pin moves (A → B → C, A returns last)

Traced:
1. `triggerGeocode(B)` aborts A's controller and calls `gate.invalidate()` (`useReverseGeocode.ts:106-108`).
2. When A's promise settles, `isLatest(ticketA)` is false, so the result is discarded (`:74,78`).
3. The C result is applied only if its ticket is current.

**Verdict:** an older address cannot overwrite a newer pin. This is also covered by `__tests__/address/requestGate.test.ts` (pass).
**Remaining issue:** abandoned lookups are still *executed* (LOC-009). That is a latency and cost problem, not a correctness one.

## 4. Address selection logic (`addressSelect.ts`)
A well-designed, provider-agnostic ranking:
- Tiers: place > building > house > street > locality > city.
- Proximity demotion: specific tiers require ≤ 80 m; streets ≤ 400 m.
- Completeness bonus; plus-code stripping.
- Text never invents components, and the result always carries the **requested** coordinates (`:304-336`). Unit tests: `addressSelect.test.ts`, `geocodeParse.test.ts` pass.

Weakness: `dedupeParts` comment says "skip a part contained in one we kept", but the code only skips exact case-insensitive duplicates (`:258`). This is cosmetic ("Gulberg, Gulberg III" can appear).

## 5. UI / UX flow audit (map picker E5)

| Step | Current behaviour | Assessment |
|---|---|---|
| Open | Map renders immediately at the live fix (if any) or the Faisalabad overview; GPS refresh is non-blocking | ✅ not blocked by GPS |
| Locating | No explicit "finding your location…" indicator on the map; `UseMyLocationButton` shows a spinner only when tapped | ⚠ silent |
| Accuracy | Never shown; no blue dot (`showsUserLocation={false}`) | ❌ LOC-020 |
| Pin move | Pin lifts while dragging; "Locating pinpoint address…" while resolving; Save disabled while geocoding (`AddressConfirmSheet.tsx:266,444`) | ✅ clear which point is selected |
| Address text | Geocoder output; not editable | ❌ LOC-005 |
| Details | Label chips (Home/Office/Other + custom), notes ≤ 120 chars | ⚠ notes lost (LOC-004) |
| Duplicate | Non-blocking "similar to your saved X" within 15 m (`AddressConfirmSheet.tsx:223-236`) | ✅ |
| Save | Double-tap guard (`isSubmittingRef`), service-area check, optimistic list | ✅ |
| Failure | Alert "Couldn't save address…"; pin and form remain on screen | ✅ (lost if the user leaves: LOC-033) |
| Return to booking | Draft updated with id/coordinates; edit path refreshes the draft (`add.tsx:368-380`) | ✅ |
| Accessibility | `accessibilityRole`/`Label` on primary buttons; reduce-motion honoured for pin animation (`AddressPickerMap.native.tsx:58-73`) | ✅ partial (pin position not announced) |

**Quick-add sheet (E6)** lets the user type a street and save with silently attached GPS coordinates. This is the most dangerous path (LOC-002). Its "Confirm location on map" redirect exists only for the case *without* a live fix.

## 6. Places / geocoding client code
- Correct region restriction: `includedRegionCodes:['PK']`, 35 km bias around Faisalabad (`places.service.ts:48-57`); legacy `components=country:pk` (`:85`).
- 2xx with empty body treated as "no results" (avoids extra calls), `:61-76`. Good.
- No timeouts on Places calls (`fetch` without timer) and no signal on Place Details. A hanging request leaves the spinner until the OS socket timeout. **P3.**
- Silent fall-through on 403/`REQUEST_DENIED` hides LOC-001.

## 7. Memory & listeners
- All watchers removed on settle, on timeout, in `finally`, and in the late-`then` branch (`location.service.ts:211-220,311-316,402-407`). No leak found.
- `AppState` subscription removed (`useLocation.ts:254-257`). Keyboard listeners in the confirm sheet are removed (read, lines 128-170).
- In-memory resolver cache is capped at 200 entries with LRU (`addressResolver.ts:27,231`). The worker coordinate snapshot map has a TTL but no size cap (`locationUtils.ts:83-84`); it is bounded by the number of workers seen. P3.

## 8. Tests executed

```
node --test __tests__/address/*.test.ts __tests__/location/*.test.ts
tests 42 · pass 42 · fail 0   (2026-11-16)
```
Covered: candidate selection, Google parse, request gate, service-area polygon, keyboard layout, worker distance, query rounding.
Not covered: `location.service` acquisition logic, `useReverseGeocode`, `usePlacesAutocomplete`, `useAddresses` payload mapping (would have caught LOC-004), booking address assembly (LOC-007/016), store sync on delete (LOC-006).
