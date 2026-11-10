# TaskLync Customer App: Offers, Deals & Discounts Implementation Spec

> **Audience:** a coding agent implementing this feature in the Tasklync Customer App (React Native + Expo).
> **Source of truth:** the backend code in this repository, read on 2026-11-09 (branch `develop`).
> **Rule followed:** nothing here is assumed. Where the backend does not do something, it is listed under **MISSING**. Where I could not confirm behavior from code, it is marked **UNVERIFIED**.
> **Nothing in the backend was changed to produce this document.**

---

## 0. Executive summary

### 0.1 What actually exists in the backend

There is **no entity called "Deal"** anywhere in the backend. The only discount mechanisms are two separate systems, both owned by `booking-service`:

| # | System | Who creates it | How a customer gets it | Who pays for the discount |
|---|---|---|---|---|
| 1 | **Coupon** (platform promo code) | Admin only (internal admin API) | Customer types a code at checkout | **Platform** (`discount_funding = 'PLATFORM'`) |
| 2 | **Promotion** (called "offer" in worker-facing code and error text) | Worker (`POST /promotions`), auto-approved or admin-approved | **Automatic** (no code, applied to that worker's bookings) or **by code** (worker set a code) | **Worker** (`discount_funding = 'WORKER'`) |

Plus: search results carry a small promotion badge on worker cards (search-service).

### 0.2 What the customer app can do today (existing backend)

1. Show a discount badge on worker cards in search results (`promotion` field).
2. List a worker's active **automatic** offers on the worker profile (public endpoint, no login).
3. Validate a code at checkout and show the discounted price (`POST /coupons/validate`). It resolves **both** worker promotion codes and platform coupons.
4. Create a booking with `coupon_code`; the discount is applied atomically and snapshotted on the booking.
5. Read discount snapshot fields on a booking (`discount_amount`, `subtotal_before_discount`, `coupon_code_masked`, `discount_funding`, `promotion_id`).

### 0.3 Critical gaps the app must design around (details in section 13)

- **No endpoint lists a customer's coupons or all available offers.** Coupons the admin assigns to a user (`assigned_user_id`) cannot be discovered in-app; the user must type the code.
- **`GET /bookings/estimate` does not return promotions.** `getPublicEstimate` (which does) exists in `booking.service.ts:349` but **no route calls it**.
- **Automatic promotions are applied silently at booking creation** even when the customer typed no code, and the preview endpoint cannot preview them. The app can show a mismatch between checkout total and created-booking total unless it handles this (section 8.4).
- **Feature flags default to OFF** (`COUPONS_ENABLED=false`, `PROMOTIONS_ENABLED=false`). When off, every code returns `COUPON_NOT_VALID`.
- **Quote-based bookings (`POST /bookings/from-quote`) support no discounts at all.**
- **Payment is Cash on Delivery only.** There is no online payment step to integrate discounts with.

---

## 1. Backend map (file reference)

All paths relative to `services/booking-service/` unless stated.

| Concern | File |
|---|---|
| Coupon tables | `migrations/013_coupons.sql` |
| Promotion tables + settings | `migrations/014_promotions.sql` |
| Booking discount columns | `migrations/013_coupons.sql` (bottom), `migrations/015_booking_offer_tracking.sql` |
| Coupon routes | `src/routes/coupon.routes.ts` |
| Coupon controller | `src/controllers/coupon.controller.ts` (`validate`) |
| Coupon validator | `src/validators/coupon.validators.ts` (`validateCouponSchema`) |
| Coupon resolution + math | `src/services/coupon.service.ts` (`CouponService.resolve`, `computeDiscount`, `normalizeCode`) |
| Coupon reserve/release | `src/services/coupon-redemption.ts` (`reserveCoupon`, `releaseRedemption`, `isFirstBooking`, `maskCode`) |
| Promotion routes | `src/routes/promotion.routes.ts` |
| Promotion controller | `src/controllers/promotion.controller.ts` |
| Promotion resolution + math | `src/services/promotion.service.ts` (`resolveByCode`, `resolveAutomatic`, `check`, `computePromotionDiscount`) |
| Promotion reserve/release | `src/services/promotion-redemption.ts` (`reservePromotion`, `releasePromotionRedemption`) |
| Promotion worker/admin mgmt | `src/services/promotion-manage.service.ts` (`publicForWorker` at ~line 421) |
| Expiry sweeper job | `src/jobs/promotion-sweeper.job.ts` |
| Price math | `src/services/pricing.service.ts` (`calculatePricing`, `applyCouponDiscount`, `applyPromotionDiscount`) |
| Checkout integration | `src/services/booking.service.ts` (`createBooking` ~line 414, `previewCoupon` ~line 724, `computeEstimate` ~line 310, `getPublicEstimate` ~line 349) |
| Cancellation release | `src/services/cancellation.service.ts` (lines ~180-232) |
| Error definitions | `src/utils/errors.ts` (`CouponErrors` line 224, `PromotionErrors` line 241) |
| Error/response envelope | `src/middlewares/error.middleware.ts`, `src/utils/response.ts` |
| Rate limits | `src/middlewares/rate-limit.middleware.ts` (lines 28-31) |
| Config / flags | `src/config/index.ts` (`coupons` ~line 313, `promotions` ~line 323) |
| Admin (not for customer app) | `src/routes/internal-admin.routes.ts`, `src/services/coupon-admin.service.ts` |
| Gateway routing | `services/api-gateway/src/config/routes.config.ts` (lines 24-25), `auth.config.ts` (lines 41-45), `rate-limits.config.ts` (lines 32-33, 55-57) |
| Search badge | `services/search-service/src/services/search.service.ts` (lines 62-64), `repositories/search.repository.ts` (`findPromotionsForWorkers`) |
| Payment (COD) | `services/payment-service/src/events/consumer.ts` (~line 40-75) |
| Notifications | `services/notification-service/src/templates/push/coupon_gift_en.json`, `coupon_returned.json`, `winback_discount_en.json`; `src/events/booking-events.consumer.ts` (~line 108) |

---

## 2. Conventions every call must follow

### 2.1 Base URL and routing
The gateway routes `/api/v1/coupons` and `/api/v1/promotions` to booking-service (`routes.config.ts:24-25`). Search is `/api/v1/search` (search-service). Bookings is `/api/v1/bookings`.

Environment base URLs come from `CUSTOMER_APP_API_INTEGRATION_SPECIFICATION.md` (section 2): local `http://localhost:3000/api/v1`, staging `https://staging-api.tasklync.pk/api/v1`, production `https://api.tasklync.pk/api/v1`. The booking-service also mounts un-versioned aliases (`/api/coupons`, `/api/promotions`) in `app.ts:206-210`; use the `/api/v1` paths.

### 2.2 Auth
- `Authorization: Bearer <access_token>` for all private routes.
- Coupon and booking-create routes require role **USER** (`requireRole(ActorType.USER)`). A worker token gets 403.
- Public (no token): `GET /promotions/worker/:workerId`, `GET /bookings/estimate`, `GET /search/*` (`auth.config.ts:41-45`).

### 2.3 Response envelope (IMPORTANT discrepancy)
The actual booking-service code (`src/utils/response.ts`, `error.middleware.ts`) returns:

```jsonc
// success
{ "success": true, "data": { ... }, "message": "optional" }

// error
{ "success": false, "error": { "code": "COUPON_NOT_VALID", "message": "...", "details": [ { "field": "x", "message": "..." } ] } }
```

`CUSTOMER_APP_API_INTEGRATION_SPECIFICATION.md` section 2.2 documents a **different** envelope (`"status": "success"` / `"status": "error"`). The gateway does not rewrite bodies (no response interceptor found in `services/api-gateway/src`). **Implement a tolerant parser** that reads `success` (booking/coupon/promotion endpoints) and treats `error.code` as the machine-readable code. Confirm against a running environment before shipping.

### 2.4 Money
- All amounts are PKR, JSON **numbers** with 2 decimals (the code converts Postgres `NUMERIC` with `Number(...)` before sending, e.g. `promotion-manage.service.ts:433-440`). Booking rows returned by `GET /bookings/:id` are raw repository rows; numeric columns may arrive as numbers or strings depending on the repository mapper. **UNVERIFIED** for `bookings.*` columns: coerce with `Number()` defensively.
- Dates are ISO-8601 strings.

---

## 3. Data model (existing)

### 3.1 `coupons` (migration 013)
| Column | Type | Meaning |
|---|---|---|
| `id` | UUID | |
| `code_normalized` | VARCHAR(24), unique | uppercase alphanumerics only |
| `code_display` | VARCHAR(32) | what to show the user (batch codes are dashed, e.g. `ABCD-EFGH-...`) |
| `title`, `description` | | |
| `discount_type` | `'PERCENT' \| 'FIXED'` | |
| `discount_value` | NUMERIC(10,2) > 0 | PERCENT must be ≤ 100 |
| `max_discount_amount` | NUMERIC NULL | cap in PKR |
| `min_booking_amount` | NUMERIC default 0 | compared against pre-fee subtotal |
| `scope_category_ids` | VARCHAR(50)[] NULL | NULL/empty = all categories |
| `first_booking_only` | BOOLEAN | |
| `assigned_user_id` | UUID NULL | if set, only that user can use it |
| `status` | `PENDING_APPROVAL, REJECTED, ACTIVE, PAUSED, EXHAUSTED, EXPIRED, ENDED` | only `ACTIVE` is usable |
| `starts_at`, `ends_at` | TIMESTAMPTZ | |
| `max_redemptions`, `redemption_count` | INT | global usage cap |
| `per_user_limit` | INT ≥ 1 default 1 | |
| `budget_cap_pkr`, `budget_spent_pkr` | NUMERIC | platform budget |

Plus `coupon_user_usage (coupon_id, user_id, used_count)`, `coupon_redemptions (booking_id UNIQUE, status CONSUMED|RELEASED, discount_amount, subtotal_before)`, `coupon_status_history`.

### 3.2 `promotions` (migration 014)
Same discount fields as coupons, plus:
| Column | Meaning |
|---|---|
| `worker_id` | owner; promotion only applies to this worker's bookings |
| `offering_id` NULL | NULL = all of the worker's offerings; else one `worker_service_offerings.id` |
| `category_id` NULL | NULL = all categories |
| `reference_price` | worker price at creation (inflation guard) |
| `code_normalized`/`code_display` NULL | **NULL = automatic offer** (no code); set = code-only offer |
| `approval_mode` | `AUTO \| ADMIN` |
| `paused_by` | `WORKER \| ADMIN \| null` |

Plus `promotion_user_usage`, `promotion_redemptions` (adds `worker_cost`), `promotion_status_history`, `promotion_abuse_signals`, and single-row `promo_settings` (guardrails, section 5.3).

### 3.3 `bookings` discount columns (013 + 015)
| Column | Notes |
|---|---|
| `subtotal_before_discount` NUMERIC NULL | pre-fee subtotal before discount; null when no discount |
| `discount_amount` NUMERIC default 0 | what the **customer saved** (see 5.5 for the exact definition per funding type) |
| `coupon_id` UUID NULL | set for coupons only |
| `coupon_code_masked` VARCHAR(32) NULL | e.g. `SU****R`. Set for coupons, and for promotions **only when a code was used** |
| `discount_funding` `'PLATFORM' \| 'WORKER' \| null` | |
| `promotion_id` UUID NULL | set for promotions only |
| `worker_amount_before_discount` NUMERIC NULL | worker-side; not for customer display |
| `offered_at` | unrelated to discounts (booking offer timing to the worker) |

**`estimated_total` on a booking is already the DISCOUNTED total** (comment in `013_coupons.sql`).

---

## 4. Terminology the app should use

| Backend term | Customer-facing suggestion | Note |
|---|---|---|
| Coupon / promo code | "Promo code" | `COUPON_*` error codes are shared by promotions too |
| Promotion (automatic) | "Offer" / "Special offer" | the backend error text for workers says "offer" |
| "Deal" | not a backend concept | do not create a "Deals" tab backed by invented data. See section 13 for what a Deals screen could legitimately show today |

---

## 5. Business rules and calculations

### 5.1 Base price pipeline (`pricing.service.ts: calculatePricing`)
```
baseTotal   = priceType === 'hourly' ? basePrice * duration_hours : basePrice
subtotal    = round2(baseTotal * urgencyMultiplier * demandMultiplier * 1.0)
platform_fee      = round2(subtotal * customerFeeRate)         // customer pays on top
estimated_total   = round2(subtotal + platform_fee)
worker_commission = round2(subtotal * workerCommissionRate)
worker_amount     = round2(subtotal - worker_commission)
```
`customerFeeRate` and `workerCommissionRate` come from `pricing-config.service.ts` (DB-backed, with env fallback; `WORKER_COMMISSION_PERCENT` default 5). The app must **never compute prices itself**; always show server values.

**Pre-fee subtotal used by every discount rule:** `subtotal = estimated_total - platform_fee` (pre-discount).

### 5.2 Platform coupon: validation order (`CouponService.resolve`)
Failures marked **(opaque)** all return the same `COUPON_NOT_VALID` and **increment a wrong-code counter**; the specific-reason errors do not.

1. `COUPONS_ENABLED` false → `COUPON_NOT_VALID`.
2. User locked out (≥ `COUPON_FAIL_LIMIT` failures, default 5, window `COUPON_FAIL_WINDOW_SECONDS`, default 900 s, tracked in Redis key `coupon:fail:{userId}`) → `COUPON_ATTEMPTS_LOCKED` (429). Redis outage = fail-open.
3. Normalize: uppercase, strip everything except `A-Z0-9`. Length must be 4..24 after normalizing, else **(opaque)**.
4. Code not found **(opaque)**.
5. Not usable **(opaque)**: status ≠ `ACTIVE`, outside `[starts_at, ends_at)`, `redemption_count >= max_redemptions`, `budget_spent >= budget_cap`, or `assigned_user_id` set and ≠ this user.
6. From here the code "belongs" to the user and specific reasons are shown:
   - price type is `quote` → `COUPON_NOT_APPLICABLE`
   - `scope_category_ids` non-empty and not containing `category_id` → `COUPON_NOT_APPLICABLE`
   - `subtotal < min_booking_amount` → `COUPON_MIN_AMOUNT`
   - `first_booking_only` and user already has a booking at `ACCEPTED` or later (or a consumed first-booking coupon) → `COUPON_NOT_FIRST_BOOKING`
   - `coupon_user_usage.used_count >= per_user_limit` → `COUPON_USER_LIMIT_REACHED`
   - computed discount ≤ 0 → `COUPON_MIN_AMOUNT`
   - `budget_spent + discount > budget_cap` → **(opaque)**

### 5.3 Platform coupon: discount formula (`computeDiscount`)
```
subtotal = round2(estimated_total - platform_fee)
d = PERCENT ? subtotal * value / 100 : value
if max_discount_amount != null:  d = min(d, max_discount_amount)
d = min(d, subtotal * COUPON_MAX_DISCOUNT_PCT / 100,      // default 50
           subtotal - COUPON_MIN_PAYABLE_SUBTOTAL_PKR)    // default 200
if NOT COUPON_PLATFORM_SUBSIDY_ENABLED:                   // default false
    d = min(d, platform_revenue)                          // platform_fee + worker_commission
d = max(0, round2(d))
```
Applied by `applyCouponDiscount`:
```
estimated_total  = estimated_total - d          // platform_fee and worker_amount UNCHANGED
discount_amount  = d
subtotal_before_discount = subtotal
```
Note: because the platform fee is **not** reduced, `platform_fee` in the response stays the original fee. Customer pays `subtotal + platform_fee - d`.

**Consequence of the subsidy flag being off (default):** the discount is capped at `platform_fee + worker_commission`, which is typically small (platform-fee+commission rates are 5%+5% in the defaults visible in code). A "50% off" coupon may therefore be silently reduced. The app must show the server-returned discount, never the nominal coupon value.

### 5.4 Worker promotion: resolution (`PromotionService`)
Only runs when `PROMOTIONS_ENABLED` is true.

**By code (`resolveByCode`)**: normalize (same as coupons); length 4..24 else returns `null` (treated as "not a promotion code"); not found → `null` (caller falls through to coupons, coupon failure counter untouched). Found → `check(...)`; failure throws a `COUPON_*` error.

**Automatic (`resolveAutomatic`)**: looks at the worker's `ACTIVE`, **code-less**, in-window, not-exhausted promotions (ordered by `created_at`, `LIMIT 10`), runs `check` on each, and picks the one with the **largest customer saving** (`pricing.discount_amount`). Returns `null` if none.

**`check` rules (in order)**:
1. Live: `status='ACTIVE'`, in window, not exhausted, **and** `promotion.worker_id == booking worker_id` else `COUPON_NOT_VALID`.
2. price type `quote` → `COUPON_NOT_APPLICABLE`.
3. `category_id` set and ≠ booking category → `COUPON_NOT_APPLICABLE`.
4. `offering_id` set → must match one of the worker's offerings with `service_id::text = serviceId OR id::text = serviceId`, else `COUPON_NOT_APPLICABLE`. (If the customer booked without `service_id`, an offering-scoped promotion never applies.)
5. Inflation guard: `basePrice > reference_price * (1 + price_inflation_tolerance_pct/100)` → `COUPON_NOT_APPLICABLE`.
6. `subtotal < min_booking_amount` → `COUPON_MIN_AMOUNT`.
7. If a user is known: `first_booking_only` check → `COUPON_NOT_FIRST_BOOKING`; `per_user_limit` → `COUPON_USER_LIMIT_REACHED`.
8. discount ≤ 0 → `COUPON_MIN_AMOUNT`.

### 5.5 Worker promotion: discount formula and what `discount_amount` means
`computePromotionDiscount` (discount taken off the **pre-fee subtotal**):
```
d = PERCENT ? subtotal * value / 100 : value
if max_discount_amount != null: d = min(d, max_discount_amount)
d = min(d, subtotal * max_discount_pct/100,        // promo_settings, default 30
           max_fixed_discount_pkr,                 // default 1000
           subtotal - min_payable_subtotal_pkr)    // default 200
d = max(0, round2(d))
```
`applyPromotionDiscount` **recomputes everything on the smaller subtotal**:
```
newSubtotal = subtotal - d
platform_fee    = newSubtotal * customerFeeRate
estimated_total = newSubtotal + platform_fee
discount_amount = ORIGINAL estimated_total - NEW estimated_total   // includes the fee reduction
```
So for worker promotions the customer's saving (`discount_amount`) is **slightly larger than `d`** because the platform fee shrinks too. `discount_on_subtotal` (= `d`) exists only inside the service result and is **not** persisted or returned by the preview endpoint.

Worked example (**illustrative rates 5% fee, not guaranteed backend values; always trust the server**): subtotal 1000, fee 50 → total 1050.
- Coupon 10% (d=100, assuming subsidy cap allows): total 950, `discount_amount` 100, fee stays 50.
- Promotion 10% (d=100): newSubtotal 900, fee 45, total 945, `discount_amount` 105.

### 5.6 Which discount wins at checkout
In `createBooking` (and mirrored in `previewCoupon`):
1. If `PROMOTIONS_ENABLED`:
   - `coupon_code` provided → `resolveByCode`.
   - **no** `coupon_code` → `resolveAutomatic` (**auto-applied silently**).
2. If a promotion applied → it is used; **no coupon is stacked**.
3. Else if `coupon_code` provided → platform coupon `resolve` (errors throw).
4. **One discount per booking.** No stacking. `coupon_redemptions.booking_id` and `promotion_redemptions.booking_id` are both UNIQUE.

Corner case: if the customer types a code that is **not** a promotion code, `resolveByCode` returns `null`, and `resolveAutomatic` is **not** run (it is in the `else` branch of the ternary). So typing a coupon code **forfeits the worker's automatic offer**, and the coupon is used instead. The app should tell the user this when both exist (section 9.4).

### 5.7 Redemption lifecycle (atomic, in the booking transaction)
`reserveCoupon` / `reservePromotion` run **inside** the booking DB transaction after the booking row is inserted. Each guard is a conditional `UPDATE`/`INSERT`, so two parallel bookings cannot both take the last use. Any failure rolls back the booking too.
- Counters: `redemption_count + 1`; coupons also `budget_spent_pkr + discount`. If `redemption_count + 1 >= max_redemptions`, status becomes `EXHAUSTED`.
- Per-user: `*_user_usage.used_count + 1` guarded by `< per_user_limit`.
- Race errors the app can receive at booking time even after a successful preview: `COUPON_NO_LONGER_AVAILABLE` (409), `PROMOTION_NO_LONGER_AVAILABLE` (409), `COUPON_USER_LIMIT_REACHED`, `COUPON_NOT_FIRST_BOOKING`.

### 5.8 When a used discount is given back (`releaseRedemption` / `releasePromotionRedemption`)
Only via `CancellationService.processCancellation` and only when the booking has `coupon_id` / `promotion_id`.

**Kept (NOT released)** when either:
- actor is the **customer** and the booking status being left is `ACCEPTED`; or
- cancellation code is `CUSTOMER_NO_SHOW`.

**Released** in every other cancellation path that goes through `processCancellation` (customer cancels while `PENDING`, worker cancel, admin cancel, system cancel such as booking timeout `booking-timeout.job.ts`, payment-failed, worker no-show). On release: redemption row → `RELEASED`, counters decremented, `EXHAUSTED` → `ACTIVE` again if the window is still open, per-user usage decremented.

Cancel event payload includes `coupon_released`, `coupon_code_masked`, `promotion_released`, `promotion_id`, `discount_amount`, `discount_funding`; the notification service sends the `coupon_returned` push **only when `coupon_released === true`** (`booking-events.consumer.ts:108-112`). **Promotion release sends no customer push** (UNVERIFIED beyond that consumer; no promotion branch found).

**Known hole (verified by reading code, see section 13):** the worker "reject" final path (`booking.service.ts: rejectBooking`, ~line 1443, `repo.updateStatus(..., REJECTED, ...)`) does **not** call `processCancellation` and contains no release call. A rejected booking that had a coupon/promotion appears to keep the redemption consumed. The app cannot fix this; do not promise "coupon returned" for rejected bookings.

### 5.9 Other business limits that interact with discounts
- COD ceiling: `risk.assertWithinCodLimit(finalPricing.estimated_total)` is checked against the **discounted** total; `MAX_COD_AMOUNT_PKR` default 50000 → `AMOUNT_EXCEEDS_COD_LIMIT` error (`SafetyErrors`, `utils/errors.ts`).
- Refund math (`cancellation.service.ts: computeRefund`) uses `booking.estimated_total` (the discounted total) as the base. Policy constants in `config/pricing.config.ts`: before accept 100%, after accept >24h 90%, <24h 50%, after worker arrival 0%. For COD the "refund" is a platform-fee waiver (`refund_kind: 'FEE_WAIVER'` in the cancel event). The app should display refund/fee amounts returned by the cancel API, not compute them.
- No-show fee: `NO_SHOW_FEE_PKR`, capped at `estimated_total` (`booking.service.ts:~2093`).

---

## 6. Existing APIs: full contracts

### 6.1 Validate / preview a code: `POST /api/v1/coupons/validate`
Role: USER. Rate limits: gateway 20/min/user (`rate-limits.config.ts:55`), service 10/min (`rate-limit.middleware.ts:28`), plus the Redis wrong-code lock. **Non-binding: nothing is reserved.**

Request (`validateCouponSchema`, `coupon.validators.ts`):
```ts
interface ValidateCodeRequest {
  worker_id: string;        // uuid
  category_id: string;      // 1..50 chars
  service_id?: string;      // uuid, optional (needed for offering-scoped promotions)
  scheduled_at: string;     // ISO datetime (z.string().datetime())
  duration_hours: number;   // 0.5..12
  latitude: number;         // inside PAKISTAN_BBOX (src/utils/geo.utils.ts)
  longitude: number;        // inside PAKISTAN_BBOX
  is_urgent: boolean;       // default false
  coupon_code: string;      // trimmed, 3..32 chars
}
```
Send the **same** `worker_id / category_id / service_id / scheduled_at / duration_hours / lat / lng / is_urgent` that the booking will use, otherwise the preview total will differ from the created booking.

Responses (HTTP 200 for both valid and invalid; see error table for non-200):
```ts
interface PricingView {            // previewCoupon.view(); worker earnings never exposed
  currency: string;                // "PKR"
  price_type: string;              // "fixed" | "hourly" | "quote"
  subtotal_before_discount: number;
  discount_amount: number;         // customer saving; 0 when invalid
  platform_fee: number;
  estimated_total: number;         // payable total after discount
}

interface ValidateCodeValid {
  valid: true;
  preview_only: true;
  coupon: { code: string; title: string; ends_at: string };   // code = code_display (promotion without display code falls back to title)
  pricing: PricingView;
  funding?: 'WORKER';              // present ONLY for worker promotions; absent for platform coupons
}

interface ValidateCodeInvalid {
  valid: false;
  preview_only: true;
  reason_code: CouponErrorCode;    // see 6.6
  message: string;
  pricing: PricingView;            // the NON-discounted view, use it to keep the price card correct
}
// wrapped as { success: true, data: ValidateCodeValid | ValidateCodeInvalid }
```
Behavior notes:
- `COUPON_*` errors except `COUPON_ATTEMPTS_LOCKED` come back as **HTTP 200** with `valid:false`. `COUPON_ATTEMPTS_LOCKED` is a real **429** error envelope. Other failures (validation 400, auth 401/403, pricing failure) are normal error envelopes.
- `coupon.ends_at` is the expiry to display.
- For coupons, `pricing.platform_fee` equals the original fee; for worker promotions it is the **reduced** fee.
- Preview does **not** return which promotion/coupon ID matched, nor `discount_on_subtotal`.

### 6.2 Public: a worker's active automatic offers: `GET /api/v1/promotions/worker/:workerId`
No auth. Gateway limit 120/min/IP; service limit 60/min.
```ts
interface PublicWorkerOffer {
  id: string;                     // promotions.id
  title: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  max_discount_amount: number | null;
  ends_at: string;
}
// { success: true, data: PublicWorkerOffer[] }   (max 10, oldest first; [] when none or when workerId is not a UUID)
```
Returns only: `status='ACTIVE'`, **code-less**, in window, not exhausted. **Does not** return `description`, `min_booking_amount`, `category_id`, `offering_id`, `first_booking_only`, `per_user_limit`, or remaining uses, and it does **not** check `PROMOTIONS_ENABLED`. It is **not** filtered per user (a first-booking-only offer is shown to everyone) and does not account for the user's prior usage.

### 6.3 Search result badge: `GET /api/v1/search/workers`
Public. Each worker item has (search-service `types/index.ts:49`, `search.service.ts:62-64`):
```ts
promotion?: { title: string; discount_pct: number; ends_at: string } | null;
```
`discount_pct` is an **effective percentage** (`discount_pct_eff`): for FIXED offers it is `value / reference_price * 100`, capped by `max_discount_amount / reference_price * 100` (`indexing.service.ts:27-31`). The best (highest pct) live automatic promotion per worker is returned. Code-only promotions are excluded. The search cache version is `v4`; promotion changes trigger a reindex via `promotion.events` (`search-service/src/events/promotion-events.consumer.ts`), so the badge can lag by the event latency. Treat as approximate; the real price comes from preview/booking.

### 6.4 Price estimate: `GET /api/v1/bookings/estimate`
Public (per-IP limit 120/min). Query: `worker_id, category_id, service_id?, scheduled_at, duration_hours (0.5..24, default 2), latitude, longitude, is_urgent (true|false|1)`.

**Current behavior:** `BookingController.getEstimate` calls `getPriceEstimate`, which returns the **full `PricingResult`** (including `worker_commission`, `worker_amount`, `platform_revenue`) with **no promotion info** and no discount. Declared type (`types/index.ts`, `PricingResult`):
```ts
interface PricingResult {
  base_price: number; urgency_multiplier: number; demand_multiplier: number; time_of_day_multiplier: number;
  estimated_total: number; platform_fee: number; worker_commission?: number; worker_amount: number;
  platform_revenue?: number; currency: string; price_type: string;
  // discount_* optional fields exist on the type but are not populated by this endpoint
}
// { success: true, data: PricingResult, message: "Price estimate calculated" }
```
The app must **not** display `worker_amount`, `worker_commission`, `platform_revenue`. (Backend gap: this leaks worker economics publicly; see section 13.)

`getPublicEstimate` (promotion-aware, no worker earnings) is implemented but **unrouted**. Do not call it; it is not reachable.

### 6.5 Create booking with a code: `POST /api/v1/bookings`
Role: USER. Full schema `createBookingSchema` (`validators/booking.validators.ts:13-30`):
```ts
interface CreateBookingRequest {
  worker_id: string;            // uuid
  category_id: string;          // 1..50
  service_id?: string;          // uuid
  service_type: 'ONE_TIME' | 'RECURRING';
  scheduled_at: string;         // ISO datetime, must be in the future
  duration_hours: number;       // 0.5..12
  address_id: string;           // uuid
  address_text: string;         // 5..500
  latitude: number;             // PAKISTAN_BBOX
  longitude: number;
  is_urgent: boolean;
  description?: string;         // ≤ 1000
  coupon_code?: string;         // trimmed, 3..32; OPTIONAL
}
```
Returns 201 with the booking row (repository row, `Booking` in `types/index.ts`). Discount-related fields on `Booking`:
```ts
interface BookingDiscountFields {
  estimated_total: number;                 // DISCOUNTED payable total
  platform_fee: number;
  subtotal_before_discount?: number | null; // null if no discount
  discount_amount?: number;                // 0 if no discount
  coupon_id?: string | null;               // coupons only
  coupon_code_masked?: string | null;      // e.g. "SU****R"
  discount_funding?: 'PLATFORM' | 'WORKER' | null;
  promotion_id?: string | null;
  worker_amount_before_discount?: number | null; // do not display
}
```
Discount-specific failure modes of this call: any `COUPON_*` error from 6.6 as a **real error envelope** (422/409/429), **not** the soft `valid:false` shape. `AMOUNT_EXCEEDS_COD_LIMIT` if the discounted total still exceeds the COD limit. Other booking errors (slot conflict, worker unavailable, etc.) are out of scope here; see `BOOKING_SERVICE_CUSTOMER_API_SPECIFICATION.md`.

Rate limits: `limiters.create` + `limiters.createHourly` (booking-service).

### 6.6 Error codes (`utils/errors.ts`)
| Code | HTTP | Message (server text) | Meaning for UI |
|---|---|---|---|
| `COUPON_NOT_VALID` | 422 | "This coupon is not valid." | Opaque: wrong, expired, not yours, exhausted, or feature off. Do **not** guess the reason. |
| `COUPON_NOT_APPLICABLE` | 422 | "This coupon cannot be used for this service." | Wrong category/service/worker price/quote-type |
| `COUPON_MIN_AMOUNT` | 422 | "This coupon needs a booking of at least PKR {min}." | Min spend not met (also used when the discount would compute to ≤ 0) |
| `COUPON_NOT_FIRST_BOOKING` | 422 | "This coupon is only for your first booking." | |
| `COUPON_USER_LIMIT_REACHED` | 422 | "You have already used this coupon." | |
| `COUPON_NO_LONGER_AVAILABLE` | 409 | "This coupon just ran out. Continue without it or try another." | Race at booking time |
| `COUPON_ATTEMPTS_LOCKED` | 429 | "Too many wrong codes. Try again in a few minutes." | Lockout; window ≈ 900 s by default (server does not return a retry-after value) |
| `PROMOTION_NO_LONGER_AVAILABLE` | 409 | "This offer just ran out. Continue without it." | Race for an automatic/code promotion at booking time |

The preview endpoint converts every `COUPON_*` error except `COUPON_ATTEMPTS_LOCKED` into `valid:false`. `PROMOTION_NO_LONGER_AVAILABLE` is not a `COUPON_` code, so it is **not** softened and only surfaces from `POST /bookings`.

Worker-management errors (`PROMOTION_INVALID`, `PROMOTION_LIMIT_REACHED`, etc.) are for the Worker app and not relevant here.

### 6.7 Existing booking read endpoints (for showing the discount after booking)
`GET /api/v1/bookings` (query: `page, limit ≤ 100, status, from_date, to_date`) and `GET /api/v1/bookings/:id` return `Booking` rows including the discount fields in 6.5. `GET /bookings/:id` is access-checked per requester. The cancel response and events carry `discount_amount`, `coupon_released`, `promotion_released` (event payload; **UNVERIFIED** whether the HTTP cancel response body exposes `coupon_released`, so re-fetch the booking after cancel).

---

## 7. Customer-facing flows (what the backend supports)

```
SEARCH LIST ──badge──> WORKER PROFILE ──offers list──> SERVICE/SLOT SELECTION
                                                           │
                                                           ▼
                                                  CHECKOUT / BOOKING SUMMARY
                                  (price estimate) ──> [Have a promo code?] ──> POST /coupons/validate
                                                           │                         │
                                                           │               valid → show discounted price
                                                           │               invalid → show message, keep original price
                                                           ▼
                                                  POST /bookings { coupon_code? }
                                                           │
                              ┌────────────────────────────┼────────────────────────────┐
                              ▼                            ▼                            ▼
                       201 booking (discounted)   COUPON_* 422/409             AMOUNT_EXCEEDS_COD_LIMIT
                              │                   (retry without code)
                              ▼
                      BOOKING DETAILS (show savings) ──> cancel ──> coupon returned or kept
```

---

## 8. Screens: modifications to existing screens

> I have not inspected the Customer App repository (it is not in this backend repo). The screen names below are **functional roles**; map them onto the app's actual screens/files. Do not assume file names.

### 8.1 Search results / worker card
- Read `worker.promotion` (may be null/absent).
- If present show a badge: `"{Math.round(discount_pct)}% OFF"` plus a `title` tooltip/subtitle and `ends_at` ("Ends in 2d"). Hide if `ends_at` is in the past (cached results may be stale).
- States: absent promotion → no badge. Never show a price based on the badge.

### 8.2 Worker profile
- Call `GET /promotions/worker/:workerId` (public). Render a horizontally scrollable "Offers" section: `title`, a label built from `discount_type/discount_value/max_discount_amount`, and `ends_at`.
  - PERCENT: `"{value}% off"` + (`max_discount_amount` ? `" (up to PKR {max})"` : `""`)
  - FIXED: `"PKR {value} off"`
- Empty array → hide the section (not an empty state).
- Do not display "first booking only"/min spend conditions: the endpoint does not provide them. Tell users "Conditions are checked at checkout."
- Also remember: the promotion is **automatic**; the user does not need to enter anything. Copy: "Applied automatically when you book."

### 8.3 Booking summary / checkout screen
This is the main change.
1. Call `GET /bookings/estimate` for the base price card (ignore any worker-earnings fields).
2. Add a **"Promo code" row** (collapsed text button → input).
3. On "Apply": `POST /coupons/validate` with the booking's current parameters.
4. On `valid:true`: replace price breakdown with `pricing` from the response; show chip `coupon.code` / `coupon.title`, "You save PKR {discount_amount}", expiry `coupon.ends_at`, a remove (✕) action. If `funding === 'WORKER'` you may label it "Offer from {worker}"; otherwise "Promo code".
5. On `valid:false`: show `message` inline under the input, keep the original price (`pricing` in the response is the non-discounted view), keep the input editable.
6. On `429 COUPON_ATTEMPTS_LOCKED`: disable the input and Apply button; show the message; re-enable after ~15 minutes (the server does not return a countdown, so store the lock start locally; **assumption flagged**: default window is 900 s and is configurable, so also re-enable on manual retry and let the server decide).
7. Any change to `worker_id, category_id, service_id, scheduled_at, duration_hours, is_urgent, address/lat/lng` after a code was applied → **invalidate the applied state** and re-run validate (prices depend on urgency/duration/time) or clear the code. Disable "Confirm" while re-validating.
8. "Confirm booking" sends `coupon_code` only when an applied code exists. Use the raw string the user typed (server normalizes).

### 8.4 Automatic offers at checkout (design decision required)
Because `POST /bookings` applies a worker's automatic offer **without** a code and the preview can only be driven by a code, there is no backend way to preview an automatic offer's exact price on the checkout screen. Options that stay within existing APIs:

1. Show the worker's offers (6.2) on the checkout screen with copy "Offer applies automatically if eligible. Final price shown after booking." and **after** booking display the true `estimated_total` / `discount_amount` from the created booking. Expect the created booking total to be **lower** than the checkout estimate.
2. Not recommended: simulate by calling validate with a made-up code. Do not do this.

Whichever is chosen, the booking-confirmation / details screen must read the booking's discount fields (8.5) rather than the checkout estimate. A backend fix is listed in section 13 (item B2).

### 8.5 Booking confirmation + booking details + booking list
Fields to render when `discount_amount > 0`:
- Price block: `Subtotal` (`subtotal_before_discount`), `Discount` (`-discount_amount`, green), `Platform fee` (`platform_fee`), **`Total` (`estimated_total`)**.
- Chip: `coupon_code_masked` if present, else "Offer applied" (automatic promotions have `coupon_code_masked = null`, `promotion_id != null`).
- Label by `discount_funding`: `PLATFORM` → "Promo code", `WORKER` → "Worker offer".

Caveat for the arithmetic line items: for **platform coupons** `subtotal + platform_fee - discount = estimated_total`. For **worker promotions** `subtotal_before_discount` is the *pre-discount* subtotal and `platform_fee` is the *reduced* fee, so that sum does **not** reconcile. Display the totals in this safe form for worker promotions: `Original total (subtotal_before_discount + original fee, not stored) ` is **not available**, so show only: `You saved PKR {discount_amount}` and `Total PKR {estimated_total}`. Concretely:
  - `discount_funding === 'PLATFORM'`: show Subtotal, Platform fee, Discount, Total.
  - `discount_funding === 'WORKER'`: show Platform fee, "You saved PKR {discount_amount}", Total. (Do not show a reconciling subtotal line.)
Booking list item: small "Saved PKR X" tag when `discount_amount > 0`.

### 8.6 Cancel booking screen
- Before confirming cancel, if `discount_amount > 0` and status is `ACCEPTED`: warn "Cancelling now means your promo code/offer will not be returned." (per 5.8 the customer cancel while `ACCEPTED` keeps the redemption). If status is `PENDING`: "Your promo code/offer will be returned."
- After cancel, re-fetch the booking. A `coupon_returned` push exists for coupons only.

### 8.7 Push notification deep links
Templates exist with deep link `tasklync://home` (`coupon_gift`, `coupon_returned`, `winback_discount`). Handle `tasklync://home`. Note: **no code in the backend emits `coupon_gift` or `winback_discount`** (templates only; searched `*.ts` across services, matches only in a template test). Do not build UI that depends on them.

---

## 9. New screens and components

### 9.1 Required (supported by existing APIs)
| Item | Purpose | Data source |
|---|---|---|
| `PromoCodeInput` component | Collapsed row → text input → Apply/Remove, error text, loading | `POST /coupons/validate` |
| `AppliedDiscountChip` | Shows code/title + saving + remove | validate response |
| `PriceBreakdown` component | Handles PLATFORM vs WORKER arithmetic differences (8.5) | validate response / booking row |
| `OfferBadge` | Percent badge on worker card | search `promotion` |
| `WorkerOffersSection` | Offers on worker profile | `GET /promotions/worker/:id` |
| `DiscountSummaryRow` | "You saved PKR X" used in booking details/list | booking row |

### 9.2 Optional screen: "Offers" list (limited by backend)
There is **no** "all offers" or "my coupons" API. A global Offers/Deals tab cannot be built from real data. What *can* be built honestly: a screen that lists offers **per worker** the user is looking at (6.2). If product wants a global Deals tab, that is a backend change (section 13, items B1/B3). Do not fabricate data or scrape search for it.

### 9.3 Navigation
- No new route is strictly required: the promo input lives inside checkout. Add `OffersSection` to the worker profile route and `Saved` tag in booking list/details routes.
- Deep link `tasklync://home` only (existing).

### 9.4 Copy rules
- Use server `message` verbatim for validation failures; do not invent reasons for `COUPON_NOT_VALID` (it is deliberately opaque to prevent code guessing).
- If a worker offer is visible on the profile and the user also types a coupon code, show a notice: "A promo code replaces this worker's automatic offer" (5.6).

---

## 10. State management and API layer

### 10.1 Suggested types (derived from sections 6.x; verify field-by-field against a real response)
```ts
export type DiscountType = 'PERCENT' | 'FIXED';
export type DiscountFunding = 'PLATFORM' | 'WORKER';

export type CouponErrorCode =
  | 'COUPON_NOT_VALID' | 'COUPON_NOT_APPLICABLE' | 'COUPON_MIN_AMOUNT'
  | 'COUPON_NOT_FIRST_BOOKING' | 'COUPON_USER_LIMIT_REACHED'
  | 'COUPON_NO_LONGER_AVAILABLE' | 'COUPON_ATTEMPTS_LOCKED'
  | 'PROMOTION_NO_LONGER_AVAILABLE';

export interface ApiOk<T> { success: true; data: T; message?: string }
export interface ApiErr { success: false; error: { code: string; message: string; details?: { field: string; message: string }[] } }

export interface SearchWorkerPromotion { title: string; discount_pct: number; ends_at: string }
export interface PublicWorkerOffer {
  id: string; title: string; discount_type: DiscountType; discount_value: number;
  max_discount_amount: number | null; ends_at: string;
}
// ValidateCodeRequest / PricingView / ValidateCodeValid / ValidateCodeInvalid: see section 6.1
```

### 10.2 Client state (checkout slice)
```ts
interface CheckoutPromoState {
  input: string;
  status: 'idle' | 'validating' | 'applied' | 'invalid' | 'locked' | 'error';
  applied?: { code: string; title: string; endsAt: string; funding?: 'WORKER'; pricing: PricingView };
  message?: string;          // server message for invalid/locked
  paramsHash?: string;       // hash of {worker_id, category_id, service_id, scheduled_at, duration_hours, is_urgent, lat, lng} at validate time
}
```
Rules:
- Re-validate or clear whenever `paramsHash` no longer matches current booking parameters.
- Debounce/disable the Apply button while `validating` (server limits are 10-20/min plus a wrong-code lockout; do **not** validate on every keystroke).
- Store `applied` only in memory (preview is non-binding; it can expire or run out before booking).
- Cache: worker offers (6.2) with a short TTL (about 60 s); do not cache validate responses across sessions.

### 10.3 Booking submission rules
- Include `coupon_code` only if `status === 'applied'` and `paramsHash` is current.
- Handle discount-related create errors:
  - `COUPON_NO_LONGER_AVAILABLE` / `PROMOTION_NO_LONGER_AVAILABLE`: show message, offer "Continue without code" (resubmit without `coupon_code`).
  - `COUPON_USER_LIMIT_REACHED` / `COUPON_NOT_FIRST_BOOKING` / `COUPON_MIN_AMOUNT` / `COUPON_NOT_APPLICABLE` / `COUPON_NOT_VALID`: clear applied state, show message, return to summary at the original price.
  - `COUPON_ATTEMPTS_LOCKED`: same as lockout above; allow "Continue without code".
- **Idempotency:** the booking endpoint has no idempotency key in the discount code path. Disable the confirm button after tap to avoid double submit (each success consumes a use).
- After success, replace local price with the booking's `estimated_total`/`discount_amount`; invalidate the bookings-list query.

---

## 11. Payment and checkout integration

- The booking-created outbox event always carries `payment_method: 'CASH_ON_DELIVERY'` (`booking.service.ts:~660`). Payment-service provisions a COD record from the **DB snapshot** (`payment-service/src/events/consumer.ts:~55`: money comes from `BookingSnapshotRepository`, "the event's `estimated_total` is the DISCOUNTED total"). Therefore:
  - The cash the customer pays the worker = `booking.estimated_total` (already discounted).
  - On completion the worker may report `cash_collected_amount`; the backend flags a mismatch if `|cash_collected - estimated_total| > 1` (`booking.service.ts:~1737`). The app should show the customer **exactly** `estimated_total` as the cash amount to hand over.
- The COD instruction text in `createBookingFromQuote` says "Pay PKR {estimated_total} in cash" (quote flow only).
- There is **no online payment, no payment-time promo, and no wallet/credit** to integrate. The `ENABLE_ONLINE_PAYMENTS` flag exists in payment-service but nothing in booking-service discount code handles online payment. If online payments are enabled later, discount behavior is **UNVERIFIED**.
- Quote flow (`POST /bookings/from-quote`): no coupon/promotion code path exists in `createBookingFromQuote` (no `coupon`/`promotion` references between lines ~2156-2420). Hide the promo-code UI on quote-based checkout. Also `COUPON_NOT_APPLICABLE` is returned for `price_type === 'quote'` in the normal flow.

---

## 12. UI states

| Surface | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Search badge | none (part of list) | no badge | none | badge visible |
| Worker offers section | skeleton row (2 cards) | **hide section** | silent hide + retry on pull-to-refresh (public endpoint; 429 possible) | cards |
| Promo code row | spinner on Apply, input disabled | collapsed "Have a promo code?" | inline red `message`; locked state with disabled input | green chip + savings + updated total |
| Checkout total | skeleton while estimate/validate in flight; disable Confirm | n/a | fall back to non-discounted total (`pricing` in `valid:false`) | updated total |
| Booking create | button spinner, disabled | n/a | per 10.3 | navigate to booking details with savings shown |
| Booking details | existing loading | no discount rows when `discount_amount` is 0 / null | existing | savings block per 8.5 |
| Cancel | existing | n/a | existing | refetch booking; show "code returned" only if `coupon_released` known (otherwise neutral message) |

Show network errors on validate as "Couldn't check the code. Try again." (not a code failure; the wrong-code counter is only incremented server-side on genuine invalid codes).

---

## 13. Backend gaps and defects (MISSING / needs backend work). Not to be fixed by the app

IDs are for tracking. The app should work around them as noted.

| ID | Gap | Evidence | App workaround |
|---|---|---|---|
| B1 | No "my coupons" / "available offers" endpoint. Assigned coupons (`assigned_user_id`) and batch gift codes cannot be discovered in-app | no customer route in `coupon.routes.ts` besides `POST /validate` | User types the code. No coupon wallet screen. |
| B2 | Estimate/preview cannot show automatic promotions. `getPublicEstimate` exists (`booking.service.ts:349`) but is not routed; `GET /bookings/estimate` calls `getPriceEstimate` | `booking.controller.ts:70-86` | Section 8.4 option 1 |
| B3 | No global active-offers/deals listing (browse by category/city) | `promotion.routes.ts` has only `/worker/:workerId`, `/mine`, create, patch | No Deals tab. Use per-worker offers |
| B4 | `GET /bookings/estimate` is public and returns worker earnings (`worker_amount`, `worker_commission`, `platform_revenue`) | `PricingResult` returned directly | Never display those fields |
| B5 | Public worker-offers endpoint omits conditions (`min_booking_amount`, `first_booking_only`, category/offering scope, per-user limit, `description`) and is not per-user | `promotion-manage.service.ts: publicForWorker` select list | Say "conditions apply" |
| B6 | Silent auto-apply: `POST /bookings` applies an automatic promotion without any user confirmation or echo of what was applied other than booking fields | `booking.service.ts:498-506` | Show savings on confirmation (8.5) |
| B7 | Typing a coupon code suppresses the worker's automatic promotion (ternary: code → `resolveByCode`, else `resolveAutomatic`) | `booking.service.ts:503-505` | Inform user (9.4) |
| B8 | Preview response does not identify promotion vs coupon explicitly for coupons (`funding` only present for `'WORKER'`), no `promotion_id`, no `discount_on_subtotal` | `previewCoupon` | Treat missing `funding` as platform coupon |
| B9 | Worker reject final path does not release coupon/promotion redemption | `booking.service.ts: rejectBooking` ~1443 uses `repo.updateStatus`, no `processCancellation`/release | Don't promise "returned" copy for rejected bookings |
| B10 | Worker reassign (`reassignBooking`) keeps the original discount snapshot while changing worker; no promo re-check or price recompute in the reassign block | grep of `reassignBooking` lines ~1230-1300 shows no coupon/promotion/pricing handling (**UNVERIFIED** whether `repo.reassignWorker` touches price) | Always display the booking row's totals after reassignment |
| B11 | No customer push for released **promotions**; `coupon_gift` and `winback_discount` push/SMS templates exist but nothing emits them | `booking-events.consumer.ts:108-112`; no emitter found | No in-app dependency |
| B12 | `PROMOTION_NO_LONGER_AVAILABLE` is not softened by preview (only create) | `previewCoupon` catch filters on `COUPON_` prefix | Handle in create path (10.3) |
| B13 | `COUPON_ATTEMPTS_LOCKED` provides no retry-after | `errors.ts:238` | Client-side timer, then retry |
| B14 | Response-envelope inconsistency between docs and code | section 2.3 | Tolerant parser |
| B15 | Flags default OFF; app cannot discover whether coupons/promotions are enabled (no capability endpoint). When OFF, valid codes return `COUPON_NOT_VALID` | `.env.example:136`, `config/index.ts:110,119` | Confirm flags per environment before QA; keep Promo UI visible but expect opaque failures |
| B16 | Platform coupon values are clamped to the platform take unless `COUPON_PLATFORM_SUBSIDY_ENABLED=true`, so nominal value ≠ real saving | `coupon.service.ts: computeDiscount` | Always show server `discount_amount` |
| B17 | `bookings.*` numeric serialization (number vs string) not verified | repository row mapper not audited | Coerce with `Number()` |
| B18 | Quote bookings: no discount support | `createBookingFromQuote` | Hide promo UI for quote flow |
| B19 | Cancel HTTP response may not expose `coupon_released` / `promotion_released` (only the event does) | `cancellation.service.ts:222-232` is the event payload | Re-fetch booking after cancel |

---

## 14. Implementation checklist for the Customer App

**Foundation**
- [ ] Add tolerant API client for `{success, data}` / `{success:false, error:{code,message,details}}` (and the doc's `status` variant).
- [ ] Add types from sections 6 and 10.1 (verify against live responses).
- [ ] Confirm `COUPONS_ENABLED` / `PROMOTIONS_ENABLED` for target environments with the backend team (B15).

**Discovery**
- [ ] Search card: render `promotion` badge; hide if expired (8.1).
- [ ] Worker profile: `GET /promotions/worker/:id`, offers section, hide when empty (8.2).

**Checkout**
- [ ] `PromoCodeInput` + `AppliedDiscountChip` + `PriceBreakdown` (9.1).
- [ ] `POST /coupons/validate` wiring with `paramsHash` invalidation (8.3, 10.2).
- [ ] Handle 200 `valid:false`, 429 `COUPON_ATTEMPTS_LOCKED`, network failures (12).
- [ ] Hide promo UI for quote-based checkout (11).
- [ ] Send `coupon_code` in `POST /bookings` only when applied and params unchanged.
- [ ] Handle create-time discount errors incl. "Continue without code" (10.3).
- [ ] Prevent double submit.

**After booking**
- [ ] Booking confirmation/details/list show savings per funding type (8.5).
- [ ] Show cash amount = `estimated_total` (11).
- [ ] Cancel screen warnings per status and refetch afterwards (8.6).
- [ ] Handle `tasklync://home` deep link (8.7).

**QA matrix**
- [ ] Valid platform coupon (PERCENT and FIXED) preview vs created booking totals match.
- [ ] Valid worker promotion code preview vs booking (note extra fee reduction, 5.5).
- [ ] Automatic offer with no code: booking total lower than checkout estimate (B6).
- [ ] Wrong code ×5 → lockout UI.
- [ ] Below-minimum amount, wrong category, first-booking-only after a prior accepted booking, per-user limit.
- [ ] Parameter change after applying (duration, urgency, time) re-validates.
- [ ] Race: last use taken between preview and create → 409 handling.
- [ ] Cancel while PENDING (returned) vs ACCEPTED (kept) vs worker reject (B9).
- [ ] COD limit with a large booking.
- [ ] Flags off → opaque `COUPON_NOT_VALID`.

---

## 15. Things deliberately not covered
- Admin/worker coupon and promotion management APIs (`internal-admin.routes.ts`, `POST/PATCH /promotions`): not part of the Customer App.
- Customer App repository structure (not available in this repo; screen/file names must be mapped by the implementer).
- Behavior of future online payments with discounts (not implemented).
- Test coverage: only `tests/unit/services/coupon.service.test.ts` exists for coupons; no promotion tests were found in `booking-service/tests`.
