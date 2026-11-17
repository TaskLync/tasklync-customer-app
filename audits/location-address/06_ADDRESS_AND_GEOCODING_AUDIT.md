# 06 — Address & Geocoding Audit (incl. Pakistan-specific)

## 1. Provider wiring vs. what is actually reachable

| Operation | Code path | Correct API? | Live status (2026-11-16, app key) |
|---|---|---|---|
| Reverse geocode (pin → text) | `addressResolver.ts`: Google Geocoding `latlng` ∥ Nominatim `/reverse` → native → coordinates label | Yes (Geocoding API is right for coordinates → address) | Google **REQUEST_DENIED (billing)**; Nominatim 200 in 1.3 s |
| Autocomplete | `places.service.ts`: Places API (New) `places:autocomplete` → legacy `place/autocomplete` → native `geocodeAsync` | Yes (Places Autocomplete (New) + session token) | New **403 PERMISSION_DENIED**; legacy **REQUEST_DENIED (billing)** |
| Place details | Places (New) `places/{id}` → legacy details | Yes | Not reachable (same project) |
| Forward geocode | Native only (fallback) | — | Google forward also **REQUEST_DENIED** |

**Conclusion:** the integration design is sound, but in the current configuration **no Google geocoding or place data reaches users** (LOC-001). All address text comes from public OSM or the OS geocoder, and search results are the user's own text (LOC-011).

## 2. Accuracy issues

| Topic | Finding | Ref |
|---|---|---|
| Locality / city | Google parse: `locality → postal_town → admin_area_2` (`addressSelect.ts:125`) ✅. Place Details (New): the last of locality/admin-2 wins → district name ❌ | LOC-026 |
| Postal code | Never parsed or stored; often absent in Pakistan anyway | — |
| Street / house number | Parsed (`street_number`, `route`, OSM `house_number/road`) but only within 80 m / 400 m proximity limits; often absent in PK results | `addressSelect.ts:44-47,224-237` |
| Empty / incomplete | Honest fallback "Location (lat, lng)", never invented ✅. The user cannot then type an address (LOC-005) ❌ | `addressResolver.ts:185-194` |
| Coordinate ↔ text mismatch | Text is always attached to the *requested* coordinates ✅. The booking-service may override coordinates but keep the text ❌ | LOC-008 |
| Place ID | Kept only in recent searches. Not stored with the address, so it cannot be re-resolved later | LOC-018 |
| Duplicates in suggestions | Places dedupes; recent searches dedupe by `place_id` (`location.store.ts:154`) ✅ | — |
| Formatting consistency | `formatAddressLine` appends the city if missing ✅; language mixes by device locale ❌ | LOC-030 |
| Failures / quota / rate limit | Swallowed; no telemetry; OSM 429/403 → 60 s backoff per device | LOC-001/010 |
| Billing | Session tokens used ✅; Pro SKU triggered by `displayName` ❌; every keystroke does up to 2 failing Google calls today | LOC-027 |

## 3. The last-meter problem

Current state:
- Coordinates = map-centre pin (good when set via the picker).
- No entrance or gate point.
- No instructions reach the worker (LOC-004).
- Navigation is by raw coordinates.
- Arrival geofence is 200 m.

| Situation | Today | Recommendation |
|---|---|---|
| Gated society / campus | Pin at the house; worker routed to the nearest road point, possibly the wrong gate | "Entrance" sub-pin option + instructions field |
| Apartment complex | No flat/floor field | Structured `unit`, `floor`, `building` fields |
| Shop in a commercial plaza | Place-tier text may name the plaza, not the shop | `unit` + landmark |
| Street-side pickup | Fine via pin | — |
| Customer-adjusted pin | Supported (fixed centre pin) ✅ | Record that it was adjusted and by how much |

**Google Geocoding API v4 `SearchDestinations`** returns destination entrances, navigation points and related places, which fits this problem well. Status check (2026-11-16):
- Google's release notes list it as released in **Preview on 28 Jan 2026**.
- Later entries add **Experimental** fields: entrances, parking, effort parameter (Nov 2026).
- The method's launch stage is not GA, and Pakistan coverage of entrance data is unverified.

**Recommendation:** do not adopt it for production now. Prototype it behind a flag after billing is restored. Measure entrance coverage on 50 Faisalabad addresses. Re-check the stage and pricing first.

## 4. Pakistan-specific address handling

Live test (2026-11-16) of the 7 required inputs, using the app's own request shapes:

| Input | Places (New) | Places legacy | Result |
|---|---|---|---|
| House 123, Street 5, Block A | 403 | REQUEST_DENIED (billing) | **NOT TESTABLE** — no Google data available |
| Near University Gate | 403 | REQUEST_DENIED | NOT TESTABLE |
| Madina Town, Faisalabad | 403 | REQUEST_DENIED | NOT TESTABLE |
| Shop 12, Commercial Market | 403 | REQUEST_DENIED | NOT TESTABLE |
| Near Allied Hospital | 403 | REQUEST_DENIED | NOT TESTABLE |
| "mdina town" (misspelling / Roman Urdu) | 403 | REQUEST_DENIED | NOT TESTABLE |
| مدینہ ٹاؤن فیصل آباد (Urdu) | 403 | REQUEST_DENIED | NOT TESTABLE |

What the app does **today** with these inputs (code path, native fallback):
1. It appends ", Faisalabad, Pakistan" and calls the OS geocoder (`places.service.ts:114-117`).
2. It shows the typed text as the suggestion, with raw coordinates as subtitle (`:123-128`).
3. "House 123, Street 5, Block A" carries no society name. Android's geocoder typically resolves such input to the city or an unrelated match. **NOT TESTED** (the OS geocoder cannot run off-device).

Reverse geocoding sample (Faisalabad centre, public coordinates) via OSM:
- Returned `addresstype=tertiary` "Clock Tower, …".
- Postcode present.
- Without `accept-language` the text is in **Urdu script**. The app sends the device language, so English devices get English (LOC-030).

Structural assessment of the data model against PK addressing:

| PK address element | Supported? |
|---|---|
| House / plot number | ❌ (only inside free `address_line`) |
| Street number | ❌ |
| Block / phase / sector | ❌ |
| Society / colony / town (e.g. Madina Town, Peoples Colony) | ⚠ via geocoder `area` only |
| Flat / floor / building | ❌ (notes dropped) |
| Shop / plaza | ❌ |
| Landmark ("near Allied Hospital") | ❌ (notes dropped) |
| Village / chak number (rural) | ⚠ OSM `village/hamlet` → `area/city` mapping exists (`addressSelect.ts:160-161`) |
| No postal code | ✅ not required |
| Urdu / Roman Urdu input | ⚠ passed through; quality depends on the provider; no transliteration |

**Can a customer identify their location without a complete postal address?** Yes, **only** through the map pin, and only via the full-screen picker. The quick-add sheet (LOC-002) and custom-request flow (LOC-013) do not give that guarantee. With notes dropped, the pin is the only last-meter signal the worker gets.

## 5. Recommendations (summary; detail in doc 13)
1. Restore billing and split keys; proxy geocoding and places through the backend (cache, key secrecy, observability).
2. Pin-first address capture with editable structured fields prefilled from the geocoder.
3. Persist `place_id`, `geocoded_address`, `location_source`, accuracy, and instructions; snapshot them into the booking.
4. Keep the provider-agnostic ranking (`addressSelect.ts`) server-side; use Google first and OSM (self-hosted) as fallback, not in parallel.
5. Run the PK test set above again once Google is reachable. Record top-5 suggestions, Place Details components and distance-to-truth for each input, plus 20 more Faisalabad samples (societies, chaks, plazas).
