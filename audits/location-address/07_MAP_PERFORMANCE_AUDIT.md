# 07 — Map Performance Audit

**No on-device measurement was possible in this audit.** Every timing below is either code-derived or marked NOT TESTED. The numbers to collect are listed in §4.

## 1. Map picker (`/profile/addresses/add`)

| Aspect | Finding | Evidence | Verdict |
|---|---|---|---|
| Blocking on GPS | Map mounts immediately with `initialRegion` (live fix or Faisalabad overview); GPS refresh runs in parallel | `add.tsx:84,133-208` | ✅ no blank screen caused by GPS |
| Animations before map ready | Queued in `pendingAnimateRegionRef` and replayed on `onMapReady` | `AddressPickerMap.native.tsx:75-108` | ✅ |
| Re-renders on pan | `onRegionChange` only lifts the pin (Reanimated shared values, UI thread). `onRegionChangeComplete` sets `currentRegion` state, which re-renders the screen (search box, confirm sheet) once per pan end | `add.tsx:217-240` | ⚠ acceptable; could move region to a ref as `useMapCamera` already does |
| Remounting | `initialRegion` prop changes after mount are ignored by react-native-maps (no remount); camera moves use `animateToRegion` | — | ✅ |
| Geocoding per pan | 500 ms debounce + 2 m same-spot skip + per-~1 m cache + in-flight dedupe | `useReverseGeocode.ts:12,24,97-112`; `addressResolver.ts:41-43,215-240` | ✅ |
| Expensive geocode chain | Google ∥ OSM (`Promise.all`), OSM serialised at 1.1 s; abandoned lookups still run | `addressResolver.ts:107-142,175,228` | ❌ LOC-009 |
| Provider | Google on Android; **Apple Maps on iOS** (custom style ignored) | `:187-188` | ⚠ LOC-032-adjacent: inconsistent look and POI labels between platforms |
| `loadingEnabled` | iOS only | `:202` | ⚠ Android shows no loading indicator while tiles load |
| Tiles with billing disabled | Maps SDK for Android needs an enabled billing account | — | **NOT TESTED — likely blank/grey tiles (LOC-001)** |
| Error boundary | `MapErrorBoundary` wraps the native map | `add.tsx:466-473` | ✅ crash-safe |

## 2. Discovery map (`/(map)/live-map`)
- `MapCanvas` uses `initialRegion` only (uncontrolled) and `showsUserLocation={false}` with a custom `UserMarker` (`tracksViewChanges={false}`).
- `WorkerMarker` turns `tracksViewChanges` off after the avatar loads (`WorkerMarker.tsx:22-25,55`), which is the correct Android marker optimisation.
- `useMapCamera` keeps the region in a ref to avoid screen re-renders (`useMapCamera.ts:36-38`).
- Discovery queries use coordinates rounded to 3 dp to avoid refetches on sub-100 m jitter (tested).

## 3. Realistic bottlenecks (ranked)
1. **Address appearance latency after a pan.** Debounce 500 ms + OSM queue (≥ 1.1 s spacing, 1.3 s measured RTT) + Google 8 s timeout (Google answers REQUEST_DENIED fast, about 0.5–0.7 s measured). Expected 2–6 s under repeated pans today. Fix LOC-009 and move resolution server-side.
2. **Search latency.** Two failing Google calls (≈ 0.25–1.8 s measured) before the native geocoder; no request timeout.
3. **Cold GPS** up to 9 s. This does not block the map, but the pin may jump after the user starts interacting. Mitigated by `userInteractedRef`.
4. **Android tile load** without a loading indicator.
5. **Low-end devices:** Reanimated pin + Google map + bottom sheet with keyboard listeners. Not profiled.

## 4. Measurements to collect (device, release build, Faisalabad, 4G and throttled)

| Metric | Method | Target to set after baseline |
|---|---|---|
| Tap "Add address" → first map frame | Perf marker on navigation + `onMapReady` | — |
| First usable interaction | first `onRegionChange` accepted | — |
| Time to live fix (p50/p90) | log `acquireFreshGPSPosition` duration + outcome | — |
| Pan end → address text shown (p50/p90) | `triggerGeocode` → `setResultState` | — |
| JS frame drops while panning | Flipper / Perf Monitor, low-end Android | — |
| Memory after 20 open/close cycles | Android Studio profiler | no growth |
| Battery: 5 min on picker | Battery Historian | no watcher after settle |
| Network calls per address saved | proxy log | ≤ 1 geocode per settled pan |

No numeric targets are promised until a baseline exists.
