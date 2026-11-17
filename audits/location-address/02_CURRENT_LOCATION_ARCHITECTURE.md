# 02 — Current Location Architecture (as built)

## 1. Stack (verified from source)

| Layer | Technology | Evidence |
|---|---|---|
| App runtime | Expo SDK 57, React Native 0.86.2, React 19.2, expo-router | `package.json` |
| Device location | `expo-location ~57.0.13` (foreground only) | `package.json`, `location.service.ts` |
| Map | `react-native-maps 1.27.2`; Google provider on Android, **Apple Maps on iOS** | `AddressPickerMap.native.tsx:187`, `MapCanvas.tsx:56` |
| Client state | Zustand stores persisted to MMKV (`location.store`, `bookingDraft.store`) | `src/store/*.ts` |
| Server state | TanStack Query 5 (`['user-addresses']`) | `src/hooks/useAddresses.ts` |
| HTTP | axios, 15 s timeout, gateway `/api/v1` | `src/services/api/client.ts:42` |
| Reverse geocode | Client side: Google Geocoding ∥ public Nominatim → native → coordinates label | `src/services/maps/addressResolver.ts` |
| Search | Client side: Places API (New) → Places legacy → native `geocodeAsync` | `src/services/maps/places.service.ts` |
| Addresses API | user-service `/users/me/addresses` (Express, zod, pg) | `services/user-service/src/routes/v1/address.routes.ts` |
| Booking | booking-service `POST /bookings`, `JobSiteService`, `GeofenceService` | `services/booking-service/src/services/*` |
| DB | PostgreSQL + PostGIS `geography(Point,4326)` | user-service `003_hardening.sql:23-24`; booking-service `001…sql:61-63` |
| Worker location | worker-service `worker_locations` (GIST) + Redis `worker:location:{id}` (TTL 180 s) | `worker-service/src/db/migrate.ts:113-127`, `geofence.service.ts:35` |

Background location: **none** (no `startLocationUpdatesAsync`, no TaskManager). Android manifest permissions are `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` only (`app.config.ts:68-70`).

## 2. End-to-end data flow

```mermaid
flowchart LR
  subgraph Device
    GPS[GNSS / Wi-Fi / Cell<br/>fused provider] --> EL[expo-location]
    EL -->|watchPosition + getCurrentPosition race<br/>≤20 m target, ≤35 m cutoff, ≤10 s age, mock reject| LS[locationService.acquireFreshGPSPosition]
    LS --> STORE[(location.store<br/>liveLocation (memory)<br/>currentLocation (MMKV))]
  end
  subgraph MapUI[Map picker  /profile/addresses/add]
    STORE -->|seed pin if live fix| MAP[MapView + fixed centre pin]
    MAP -->|onRegionChangeComplete<br/>500 ms debounce| RG[useReverseGeocode<br/>latest-request-wins]
    SEARCH[AddressSearchInput] -->|350 ms debounce, session token| PA[usePlacesAutocomplete]
  end
  RG --> RES[addressResolver]
  PA --> PS[places.service]
  RES -->|parallel| GG[(Google Geocoding<br/>❌ REQUEST_DENIED: billing)]
  RES -->|serialised 1.1 s| OSM[(public Nominatim)]
  RES -->|fallback| NAT[(OS geocoder)]
  PS --> PN[(Places New ❌ 403)] --> PL[(Places legacy ❌)] --> NAT
  RG --> CONF[AddressConfirmSheet<br/>label, notes]
  CONF -->|label, address_line, city, lat, lng<br/>notes DROPPED| UA[useAddresses.addMutation]
  UA -->|POST /users/me/addresses| GW[API Gateway]
  GW --> USVC[user-service<br/>zod: no notes field]
  USVC --> UADDR[(user_addresses<br/>geography Point 4326)]
  CONF --> DRAFT[(bookingDraft.store<br/>copy of address)]
  DRAFT -->|address_id, address_text, latitude, longitude| CB[useCreateBooking]
  CB -->|POST /bookings| GW --> BSVC[booking-service]
  BSVC -->|JobSiteService.resolve<br/>prod only| UADDR
  BSVC --> BK[(bookings.address_text<br/>bookings.job_site_location)]
  BK -->|REST + Kafka outbox| WAPP[Worker app]
  WAPP -->|geo:/maps: deep link| NAV[Navigation app]
  WAPP -->|GPS pings| WSVC[worker-service] --> WL[(worker_locations + Redis)]
  WL --> GEO[GeofenceService<br/>arrive 200 m / start 150 m / complete 500 m]
  BK --> GEO
```

## 3. Entry points that produce a location or address

| # | Entry point | File | Coordinates source | Text source |
|---|---|---|---|---|
| E1 | Onboarding permission screen | `app/(auth)/location-permission.tsx:115-169` | Fresh GPS (≤45 m) | Reverse geocode (city only) |
| E2 | Home header auto-fetch | `src/components/home/HomeHeader.tsx:35` → `useLocation()` | Last-known (≤60 s, ≤35 m) or fresh | Reverse geocode |
| E3 | Home "Select location" sheet | `src/components/home/LocationSelectSheet.tsx:108-176` | Fresh GPS or saved address | Saved / geocoded |
| E4 | Live map | `app/(map)/live-map.tsx:43` | `useLocation({autoFetch:true})` | — |
| E5 | **Full-screen map picker** | `app/profile/addresses/add.tsx` | **Map centre pin** (GPS only seeds it) | Reverse geocode / Place Details (not editable) |
| E6 | **Quick-add bottom sheet** | `src/components/address/AddAddressBottomSheet.tsx` | **Live GPS silently**, or explicit GPS button | **Free text typed by user** |
| E7 | Booking auto-create | `src/hooks/useCreateBooking.ts:143-198` | Draft address or live GPS | Draft text or reverse geocode |
| E8 | Custom request | `app/custom-request/new.tsx:176-200, 310-373` | Saved default or live GPS | Saved text or `"<city>, Pakistan"` |

E5 is the most accurate path. E6, E7 and E8 bypass the map and are the main sources of wrong destinations (LOC-002, LOC-013, LOC-016).

## 4. State ownership

| Datum | Owner | Persistence | Consumers |
|---|---|---|---|
| `liveLocation` (fix from this session) | `location.store` | memory only | picker seed, booking fallback, quick-add sheet |
| `currentLocation` | `location.store` | MMKV `current_location` (can be days old) | discovery queries (rounded to 3 dp: `roundCoordForQuery`) |
| `currentAddress` (text + coordinates it was resolved for) | `location.store` | MMKV | header label, only if within 30 m (`currentAddress.ts:8-16`) |
| `selectedAddress` + `locationMode` | `location.store` | MMKV | discovery, custom request |
| last location (duplicate) | `localStorage.cacheLastLocation` | MMKV (another instance) | written only (LOC-032) |
| booking address copy | `bookingDraft.store.address` | MMKV | `useCreateBooking` |
| saved addresses | TanStack Query cache | memory, staleTime 60 s | lists, picker duplicate check |

There are three client copies of "the address the customer means": `selectedAddress`, `bookingDraft.address` and the query cache. They are synced by hand in several places (`add.tsx:362-380, 437-452`), but not by the list screen's delete (LOC-006) or on hydrate (LOC-017).

## 5. Points where data becomes inaccurate, delayed, duplicated or lost

| # | Where | What happens | Ref |
|---|---|---|---|
| 1 | Cloud project | All Google web services denied → OSM/native only | LOC-001 |
| 2 | Quick-add sheet | GPS point attached to typed text | LOC-002 |
| 3 | `acquireFreshGPSPosition` | Fixes > 35 m rejected; approximate permission never succeeds | LOC-012 |
| 4 | Reverse-geocode queue | Seconds of delay under rapid pin moves | LOC-009 |
| 5 | Search fallback | Query text echoed; centroid pinned | LOC-011 |
| 6 | Confirm sheet → API | Notes dropped; address text not editable | LOC-004/005 |
| 7 | Booking assembly | Saved id + GPS coordinates; placeholder UUIDs | LOC-016/007 |
| 8 | Address delete / hydrate | Stale selected address | LOC-006/017 |
| 9 | booking-service | Verification prod-only; custom requests unverified; text not reconciled | LOC-008 |
| 10 | Worker app | No instructions; (0,0) fallback | LOC-004/031 |

## 6. Things verified as correct
- Every PostGIS write uses `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`, and every read uses `ST_Y` = lat, `ST_X` = lng:
  - user-service `address.repository.ts:85,93-94,117-120`
  - booking-service `booking.repository.ts:85,160-161`
  - custom-request repository `:38,43-44`
  - worker-service `location.repository.ts:33`, `nearby.repository.ts:70-72,114-116` with params `[lng, lat]` (`:189-190`)
- No swapped coordinates were found.
- Bookings store a snapshot (`address_text`, `job_site_location`), so editing a saved address does not change past bookings.
- Spatial indexes: `idx_bookings_job_site` (GIST), `idx_csr_job_site` (GIST), `idx_worker_locations_geo` (GIST).
