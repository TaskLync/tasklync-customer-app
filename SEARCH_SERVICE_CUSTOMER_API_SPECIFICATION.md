# Search Service API & Customer App Integration Specification

> **Author:** Senior Backend & DevOps Engineer  
> **Target Audience:** `tasklync-customer-app` Mobile Engineers (React Native / Expo), Frontend Developers, Backend Integrators  
> **Service:** `search-service` (v1.2.0 — Ranking, Multilingual & Company/Handyman Discovery)  
> **API Gateway Base URL (HTTP):** `https://api.tasklync.pk/api/v1/search` (Local Dev: `http://localhost:3000/api/v1/search`)  
> **Authentication:** Public (Optional `Authorization: Bearer <ACCESS_TOKEN>` honoured for blocked-worker filtering & user-scoped rate limits)  
> **Upstream Internal Port:** `3019` (`http://search-service:3019` on Docker network)

---

## 1. Executive Summary & Architecture

The **TaskLync Search Service** is the sole discovery engine for the TaskLync marketplace (worker-service's legacy `/search/*` routes are retired). It maintains a denormalized, read-optimized search index (`worker_search_documents`) of every verified, active professional and company on the platform.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                        tasklync-customer-app (Expo)                        │
│   Search Bar (Autocomplete)  •  Trending Chips  •  Filters & Infinite List │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ HTTPS GET /api/v1/search/*
                                      │ (Optional Authorization: Bearer <JWT>)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                             API Gateway (:3000)                            │
│  1. Strips spoofable X-* headers                                           │
│  2. IP Rate Limit (120/min workers, 240/min autocomplete, 60/min trending) │
│  3. Optional JWT Verify -> Injects X-User-Id, X-User-Role, X-Internal-Key  │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ Internal HTTP (:3019)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           Search Service (:3019)                           │
│  • Full-Text Search: English stemming + Simple (Urdu / Roman Urdu / Names) │
│  • Typo Tolerance: PostgreSQL pg_trgm word_similarity                      │
│  • Synonym Expansion: Roman Urdu & domain terms (bijli -> electrician)     │
│  • 8-Signal Bayesian Ranking + PostGIS Geo-Radius Filtering                │
│  • Privacy: Grid-snapped coordinates (~500m) & rounded distances (100m)    │
└───────────┬─────────────────────────┬──────────────────────────┬───────────┘
            ▼                         ▼                          ▼
   PostgreSQL + PostGIS         Redis (Cache &            Kafka Consumers
     (Shared Database)         Rate Limit Store)     (worker/review/booking)
```

### Core Capabilities & Guarantees
1. **Multilingual & Typo-Tolerant Search:** Supports English (`electrician`, `ac repair`), Urdu script (`الیکٹریشن`), Roman Urdu synonyms (`bijli`, `nalka`, `mistri`, `safai`, `barhai`, `rang`), and typo-tolerant trigram matching (`elecrician`).
2. **8-Term Versioned Ranking Engine:** Combines text relevance (`0.28`), Bayesian rating quality (`0.24`), proximity distance (`0.20`), response speed (`0.06`), recent activity (`0.06`), live availability (`0.05`), trust boosts/badges (`0.07`), and review recency (`0.04`).
3. **Individual Handyman & Company Support:** Supports filtering by `provider_type` (`INDIVIDUAL`, `COMPANY`, or `ANY`). Companies without live GPS coordinates are still included in city/geo searches (`distance_meters` omitted).
4. **Viewer-Aware Block Filtering:** Although search endpoints are public, sending the customer's `Authorization: Bearer <ACCESS_TOKEN>` when logged in allows the API Gateway to inject `X-User-Id`, automatically hiding any worker the customer has blocked (`user_blocks`).
5. **Location Privacy:** Indexed worker coordinates are snapped to a `0.005°` (~500m) grid and returned distances (`distance_meters`) are rounded to the nearest `100m` (minimum `100m`).

---

## 2. Authentication, Headers & Rate Limiting

### 2.1. Request Headers (Customer App -> API Gateway)

| Header | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `Authorization` | `string` | **Optional** (Recommended when logged in) | `Bearer <ACCESS_TOKEN>`. Validated by API Gateway to inject `X-User-Id` so blocked workers are excluded from results. Invalid/expired tokens on public search routes gracefully fall back to anonymous mode instead of returning `401`. |
| `X-Request-ID` | `string` | Optional | Client correlation ID matching `^[A-Za-z0-9._-]{1,64}$`. If omitted, the gateway generates a UUID v4 and returns it in the `X-Request-Id` response header. |
| `Accept` | `string` | Optional | `application/json` |

### 2.2. Gateway -> Search Service Internal Headers (Automatic)
Mobile clients **must never** send these headers (the API Gateway strips any client-supplied values at the edge and injects trusted values):
- `X-Internal-Key`: Shared 32+ char internal secret (`INTERNAL_API_KEY`).
- `X-User-Id`: Verified customer UUID (if a valid Bearer token was provided).
- `X-Forwarded-For` / `X-Real-IP`: Trusted client IP address.

### 2.3. Rate Limits (Rolling 60-Second Window)

| Endpoint | API Gateway Limit (Per IP) | Search Service Limit (Per User or IP) |
| :--- | :---: | :---: |
| `GET /api/v1/search/workers` | `120 req / min` | `60 req / min` |
| `GET /api/v1/search/autocomplete` | `240 req / min` | `120 req / min` |
| `GET /api/v1/search/trending` | `60 req / min` | `30 req / min` |
| Global `/api/v1/*` outer net | `600 req / min` (IP) / `300 req / min` (User) | `600 req / min` (IP) / `120 req / min` (User) |

---

## 3. Search Service Endpoints Catalog

### 3.1. Public Customer Endpoints (Routed via API Gateway `:3000`)

| Method | Gateway Endpoint | Auth | Cache TTL | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/search/workers` | Public (Optional JWT) | `60s` | Search, filter, geo-query, and rank verified workers & companies |
| `GET` | `/api/v1/search/autocomplete` | Public | `600s` (10m) | Prefix autocomplete for categories (EN/UR) and worker/business names |
| `GET` | `/api/v1/search/trending` | Public | `300s` (5m) | Top trending search queries over the last `24h` or `7d` |

### 3.2. Internal & Operational Endpoints (Private Network `:3019` Only — Not Routed by Gateway)

| Method | Internal Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/internal/reindex/:workerId` | `X-Internal-Key` | Immediately rebuild (or delete if unverified/banned) a single worker's search document |
| `POST` | `/internal/reindex-all` | `X-Internal-Key` | Enqueue an asynchronous full index rebuild of all verified workers via BullMQ |
| `GET` | `/health` | None | Liveness probe (`200 OK` `{"status": "ok"}`) |
| `GET` | `/health/ready` | None | Readiness probe checking PostgreSQL, Redis, and Kafka consumer state |

---

## 4. Detailed Endpoint Specifications

### 4.1. Search Workers & Companies

Performs full-text search (English, Urdu script, Roman Urdu synonyms, and trigram typo tolerance), category/city/price/rating/provider filtering, PostGIS geo-radius filtering, and multi-signal ranking.

- **Method & Path:** `GET /api/v1/search/workers`
- **Full Gateway URL:** `http://localhost:3000/api/v1/search/workers`

#### Query Parameters

| Parameter | Type | Required | Default | Constraints & Validation Rules |
| :--- | :--- | :---: | :---: | :--- |
| `q` | `string` | No | — | Trimmed length `1..100` chars. Supports English, Urdu (`الیکٹریشن`), Roman Urdu (`bijli`), and typos. |
| `category_id` | `string` | No | — | Matches `^[A-Za-z0-9_-]{1,50}$` (UUID or slug). Filters workers offering this skill category. |
| `city` | `string` | No | — | Trimmed length `1..100` chars. Case-insensitive exact match (`citext`, e.g., `Lahore`, `Karachi`, `Islamabad`). |
| `min_price` | `number` | No | — | Finite number `0..10,000,000` (PKR). Matches workers whose `max_price >= min_price`. |
| `max_price` | `number` | No | — | Finite number `0..10,000,000` (PKR). Matches workers whose `min_price <= max_price`. Must be `>= min_price`. |
| `min_rating` | `number` | No | — | Finite number `0..5` (e.g., `4.0`, `4.5`). Matches `avg_rating >= min_rating`. |
| `lat` | `number` | Conditional | — | Latitude `-90..90`. **Must** be provided together with `lng` and `radius`. |
| `lng` | `number` | Conditional | — | Longitude `-180..180`. **Must** be provided together with `lat` and `radius`. |
| `radius` | `number` | Conditional | — | Search radius in **meters** (`1..50000`, i.e., up to 50 km). **Must** be provided together with `lat` and `lng`. |
| `sort` | `string` | No | `'relevance'` | Enum: `'relevance'` \| `'rating'` \| `'price_low'` \| `'price_high'` \| `'distance'`. Note: `sort=distance` **requires** `lat`, `lng`, and `radius`. |
| `provider_type` | `string` | No | `'ANY'` | Enum: `'INDIVIDUAL'` \| `'COMPANY'` \| `'ANY'`. |
| `page` | `integer` | No | `1` | Positive integer `1..50`. |
| `limit` | `integer` | No | `20` | Positive integer `1..20`. |

> [!IMPORTANT]
> **Cross-Parameter Validation Rules (Enforced by Zod):**
> 1. **Geo Trio Rule:** `lat`, `lng`, and `radius` must **all three** be provided together, or **all three** omitted. Sending only `lat` and `lng` without `radius` returns `400 VALIDATION_ERROR`.
> 2. **Distance Sort Rule:** Setting `sort=distance` without providing `lat`, `lng`, and `radius` returns `400 VALIDATION_ERROR`.
> 3. **Price Range Rule:** If both `min_price` and `max_price` are provided, `min_price <= max_price` must hold, otherwise `400 VALIDATION_ERROR` is returned.
> 4. **No Array Params:** Sending duplicate query keys (e.g., `?q=ac&q=plumber`) is rejected with `400 VALIDATION_ERROR`.
> 5. **Empty Strings:** Empty query values (e.g., `?lat=&lng=`) are safely treated as absent (`undefined`), not coerced to `0`.

#### Example Request
```http
GET /api/v1/search/workers?q=bijli&city=Lahore&lat=31.5204&lng=74.3587&radius=10000&sort=relevance&provider_type=ANY&page=1&limit=20 HTTP/1.1
Host: api.tasklync.pk
Authorization: Bearer <OPTIONAL_CUSTOMER_ACCESS_TOKEN>
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "worker_id": "9b2c4e1a-7d3f-4a8b-9c1e-2f3a4b5c6d7e",
      "name": "Muhammad Usman",
      "bio": "Certified residential and commercial electrician with 8 years experience in UPS, solar, and wiring.",
      "avatar_url": "https://res.cloudinary.com/tasklync/image/upload/v1728000000/workers/avatars/usman.jpg",
      "city": "Lahore",
      "category_ids": [
        "c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c"
      ],
      "category_names": [
        "Electrician"
      ],
      "min_price": 800,
      "max_price": 3500,
      "avg_rating": 4.85,
      "total_reviews": 42,
      "total_bookings": 68,
      "is_verified": true,
      "is_available": true,
      "is_busy": false,
      "response_time_mins": 12,
      "badges": [
        "top_rated",
        "background_verified"
      ],
      "is_featured": true,
      "provider_type": "INDIVIDUAL",
      "business_name": null,
      "company_verified": false,
      "max_concurrent_jobs": 1,
      "distance_meters": 1400
    },
    {
      "worker_id": "4f8a9c12-3b7e-4d21-8a6c-9e0f1a2b3c4d",
      "name": "CoolTech Services",
      "bio": "24/7 Electrical & HVAC maintenance company in Lahore.",
      "avatar_url": "https://res.cloudinary.com/tasklync/image/upload/v1728000000/workers/avatars/cooltech.jpg",
      "city": "Lahore",
      "category_ids": [
        "c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c"
      ],
      "category_names": [
        "Electrician",
        "AC Technician"
      ],
      "min_price": 1500,
      "max_price": 12000,
      "avg_rating": 4.92,
      "total_reviews": 115,
      "total_bookings": 210,
      "is_verified": true,
      "is_available": true,
      "is_busy": true,
      "response_time_mins": 8,
      "badges": [
        "top_rated"
      ],
      "is_featured": false,
      "provider_type": "COMPANY",
      "business_name": "CoolTech Home Engineering Pvt Ltd",
      "company_verified": true,
      "max_concurrent_jobs": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1,
    "has_next": false
  }
}
```

#### Response Field Reference (`SearchDocument`)

| Field | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `worker_id` | `string` (UUID) | No | Unique worker identifier (use to navigate to `/workers/:workerId`). |
| `name` | `string` | No | Worker full name. |
| `bio` | `string \| null` | Yes | Short description / bio. |
| `avatar_url` | `string \| null` | Yes | Cloudinary avatar URL. |
| `city` | `string \| null` | Yes | Primary operating city. |
| `category_ids` | `string[]` | No | Array of category UUIDs/IDs. |
| `category_names` | `string[]` | No | Array of human-readable English category names. |
| `min_price` | `number \| null` | Yes | Lowest active service offering price in PKR (`null` if no active offerings). |
| `max_price` | `number \| null` | Yes | Highest active service offering price in PKR (`null` if no active offerings). |
| `avg_rating` | `number` | No | Average star rating (`0.00` to `5.00`). |
| `total_reviews` | `number` | No | Total visible customer reviews. |
| `total_bookings` | `number` | No | Total completed bookings. |
| `is_verified` | `boolean` | No | Always `true` in search results (unverified workers are never indexed). |
| `is_available` | `boolean` | No | Always `true` in search results (paused/suspended/inactive > 8d workers are filtered out). |
| `is_busy` | `boolean` | No | `true` if currently on an active job (`is_on_job`). Still bookable for future slots; show a "Busy on a job" pill in UI. |
| `response_time_mins` | `number` | No | Typical response time in minutes (defaults to `30`). |
| `badges` | `string[]` | No | Earned trust badges, e.g., `'top_rated'`, `'background_verified'`. |
| `is_featured` | `boolean` | No | Whether the worker/company is promoted/featured. |
| `provider_type` | `'INDIVIDUAL' \| 'COMPANY'` | No | Indicates solo handyman vs registered company. |
| `business_name` | `string \| null` | Yes | Registered company display name when `provider_type === 'COMPANY'`. |
| `company_verified` | `boolean` | No | `true` if company registration documents are verified. |
| `max_concurrent_jobs` | `number` | No | Number of simultaneous jobs the provider can handle (`1` for individuals, `>1` for companies). |
| `distance_meters` | `number \| undefined` | Optional | Rounded distance in meters (multiples of `100`). Present **only** when `lat`, `lng`, `radius` are provided AND the worker has an indexed GPS point. |

---

### 4.2. Autocomplete Suggestions

Returns fast prefix suggestions combining active service categories (matched by English or Urdu prefix) and verified worker/company names. Categories are always ordered first because they represent the strongest filter action.

- **Method & Path:** `GET /api/v1/search/autocomplete`
- **Full Gateway URL:** `http://localhost:3000/api/v1/search/autocomplete`

#### Query Parameters

| Parameter | Type | Required | Default | Constraints & Validation Rules |
| :--- | :--- | :---: | :---: | :--- |
| `q` | `string` | **Yes** | — | Trimmed length `2..50` chars. Sending `< 2` characters returns `400 VALIDATION_ERROR`. |
| `limit` | `integer` | No | `8` | Positive integer `1..15`. |

#### Example Request
```http
GET /api/v1/search/autocomplete?q=el&limit=8 HTTP/1.1
Host: api.tasklync.pk
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "type": "category",
      "label": "Electrician",
      "label_ur": "الیکٹریشن",
      "category_id": "c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c"
    },
    {
      "type": "worker",
      "label": "Elite Electrical Solutions",
      "worker_id": "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
    },
    {
      "type": "worker",
      "label": "Ehsan Ullah",
      "worker_id": "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f"
    }
  ]
}
```

#### Handling Autocomplete Selection in the Customer App
- When `item.type === 'category'`: Trigger worker search with `category_id = item.category_id` (and display `item.label` / `item.label_ur` as the active category chip).
- When `item.type === 'worker'`: Navigate directly to the Worker Profile screen (`/worker/${item.worker_id}`) or run worker search with `q = item.label`.

---

### 4.3. Trending Searches

Returns the most popular normalized search terms over the requested time window (`24h` or `7d`) that have been searched at least `3` times (`TRENDING_MIN_COUNT = 3`). Phone-like strings are automatically excluded for privacy.

- **Method & Path:** `GET /api/v1/search/trending`
- **Full Gateway URL:** `http://localhost:3000/api/v1/search/trending`

#### Query Parameters

| Parameter | Type | Required | Default | Constraints & Validation Rules |
| :--- | :--- | :---: | :---: | :--- |
| `limit` | `integer` | No | `10` | Positive integer `1..20`. |
| `window` | `string` | No | `'24h'` | Enum: `'24h'` \| `'7d'`. |

#### Example Request
```http
GET /api/v1/search/trending?limit=8&window=24h HTTP/1.1
Host: api.tasklync.pk
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "term": "ac repair",
      "search_count": 142
    },
    {
      "term": "electrician",
      "search_count": 98
    },
    {
      "term": "plumber",
      "search_count": 76
    },
    {
      "term": "solar installation",
      "search_count": 41
    }
  ]
}
```

---

### 4.4. Internal Reindex Endpoints (Admin / Ops Only — Port `3019`)

These endpoints are protected by `X-Internal-Key` and are **not** exposed on the public API Gateway:

1. **`POST http://search-service:3019/internal/reindex/:workerId`**
   - **Headers:** `X-Internal-Key: <INTERNAL_API_KEY>`
   - **Path Param:** `workerId` (UUID v4)
   - **Response (`200 OK`):** `{"success": true, "data": {"worker_id": "9b2c4e1a-..."}}`
2. **`POST http://search-service:3019/internal/reindex-all`**
   - **Headers:** `X-Internal-Key: <INTERNAL_API_KEY>`
   - **Response (`202 Accepted`):** `{"success": true, "data": {"queued": true}}`

---

### 4.5. Error Response Standard

All errors from both the API Gateway and `search-service` follow a unified JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "lat, lng, and radius must all be provided together",
    "details": [
      {
        "path": "",
        "message": "lat, lng, and radius must all be provided together"
      }
    ]
  }
}
```

| HTTP Status | Error Code | Cause & Customer App Handling |
| :---: | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Invalid query parameter (`q` < 2 chars on autocomplete, partial geo params, `sort=distance` without geo, `min_price > max_price`, `page > 50`). Show inline filter validation message. |
| `401` | `INVALID_INTERNAL_KEY` | Gateway -> service `INTERNAL_API_KEY` mismatch (ops configuration issue). |
| `404` | `NOT_FOUND` | Unknown endpoint path. |
| `429` | `RATE_LIMITED` | Rate limit exceeded. Back off using `Retry-After` header or debounce inputs. |
| `502` / `504` | `BAD_GATEWAY` / `GATEWAY_TIMEOUT` | Upstream `search-service` unreachable or timed out. Show retry banner. |
| `503` | `SEARCH_TIMEOUT` | PostgreSQL statement timeout (`8000ms`) exceeded. Ask user to narrow filters. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server error (includes `request_id` for log correlation). |

---

## 5. `tasklync-customer-app` Connection & Implementation Plan

Below is the step-by-step engineering plan to connect `tasklync-customer-app` (React Native / Expo with TypeScript and `@tanstack/react-query`) to the Search Service via the API Gateway.

### Architecture & Data Flow in `tasklync-customer-app`

```text
src/
├── config/
│   └── env.ts                        # EXPO_PUBLIC_API_URL (points to API Gateway :3000)
├── types/
│   └── search.types.ts               # SearchDocument, SearchWorkersParams, AutocompleteSuggestion, TrendingTerm
├── services/
│   └── api/
│       ├── client.ts                 # Axios instance with optional Bearer JWT interceptor
│       └── search.api.ts             # searchWorkers, getAutocomplete, getTrending
├── hooks/
│   ├── useDebounce.ts                # 250ms debounce hook for search input
│   └── useSearch.ts                  # useInfiniteSearchWorkers, useSearchAutocomplete, useTrendingSearches
└── components/
    └── search/
        ├── SearchHeaderBar.tsx       # Input + Autocomplete dropdown + Filter button
        ├── TrendingSearchChips.tsx   # Shown when search input is empty
        ├── SearchFilterSheet.tsx     # Category, City, Price, Rating, Provider Type, Radius, Sort
        └── WorkerSearchCard.tsx      # Displays Individual/Company badge, rating, price, busy state, distance
```

---

### Step 1: Configure API Gateway Base URL & Axios Client (`src/services/api/client.ts`)

Point the mobile app exclusively to the **API Gateway** (`:3000` in development, `https://api.tasklync.pk` in production). Attach the user's JWT access token whenever available so `search-service` automatically filters out workers blocked by that user.

```typescript
// src/services/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Android Emulator uses 10.0.2.2:3000; iOS Simulator uses localhost:3000; Physical device uses LAN IP
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Automatically attach Bearer token if the customer is logged in.
// For public search routes, this enables viewer-scoped blocked-worker filtering!
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Proceed anonymously on public routes
  }
  return config;
});
```

---

### Step 2: Define TypeScript Contracts (`src/types/search.types.ts`)

Create strict TypeScript types matching `search-service` v1.2.0 responses and query parameters:

```typescript
// src/types/search.types.ts

export type SearchSortOption =
  | 'relevance'
  | 'rating'
  | 'price_low'
  | 'price_high'
  | 'distance';

export type ProviderTypeFilter = 'INDIVIDUAL' | 'COMPANY' | 'ANY';

export interface SearchWorkersParams {
  q?: string;
  category_id?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  lat?: number;
  lng?: number;
  /** Radius in meters (1 to 50,000). Must be passed together with lat & lng */
  radius?: number;
  sort?: SearchSortOption;
  provider_type?: ProviderTypeFilter;
  page?: number;
  limit?: number;
}

export interface WorkerSearchDocument {
  worker_id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  category_ids: string[];
  category_names: string[];
  min_price: number | null;
  max_price: number | null;
  avg_rating: number;
  total_reviews: number;
  total_bookings: number;
  is_verified: boolean;
  is_available: boolean;
  is_busy: boolean;
  response_time_mins: number;
  badges: string[];
  is_featured: boolean;
  provider_type: 'INDIVIDUAL' | 'COMPANY';
  business_name: string | null;
  company_verified: boolean;
  max_concurrent_jobs: number;
  /** Rounded to nearest 100m. Present only when lat/lng/radius are sent and worker has GPS */
  distance_meters?: number;
}

export interface SearchPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
}

export interface PaginatedSearchResponse {
  success: true;
  data: WorkerSearchDocument[];
  meta: SearchPaginationMeta;
}

export interface AutocompleteSuggestion {
  type: 'category' | 'worker';
  label: string;
  label_ur?: string;
  category_id?: string;
  worker_id?: string;
}

export interface TrendingTerm {
  term: string;
  search_count: number;
}
```

---

### Step 3: Build the Search API Service (`src/services/api/search.api.ts`)

Include a guard that ensures `lat`, `lng`, and `radius` are only sent when all three are valid finite numbers, preventing `400 VALIDATION_ERROR` from partial location state.

```typescript
// src/services/api/search.api.ts
import { apiClient } from './client';
import {
  AutocompleteSuggestion,
  PaginatedSearchResponse,
  SearchWorkersParams,
  TrendingTerm,
} from '../../types/search.types';

/**
 * Sanitizes search parameters before sending to /api/v1/search/workers:
 * 1. Strips undefined, null, or empty strings.
 * 2. Ensures lat, lng, and radius are all present together (or all omitted).
 * 3. Falls back sort from 'distance' to 'relevance' if geo coordinates are missing.
 */
function sanitizeSearchParams(params: SearchWorkersParams): Record<string, string | number> {
  const hasCompleteGeo =
    typeof params.lat === 'number' &&
    Number.isFinite(params.lat) &&
    typeof params.lng === 'number' &&
    Number.isFinite(params.lng) &&
    typeof params.radius === 'number' &&
    params.radius > 0;

  const effectiveSort =
    params.sort === 'distance' && !hasCompleteGeo ? 'relevance' : params.sort;

  const clean: Record<string, string | number> = {};

  if (params.q?.trim()) clean.q = params.q.trim().slice(0, 100);
  if (params.category_id?.trim()) clean.category_id = params.category_id.trim();
  if (params.city?.trim()) clean.city = params.city.trim();
  if (typeof params.min_price === 'number' && params.min_price >= 0) clean.min_price = params.min_price;
  if (typeof params.max_price === 'number' && params.max_price >= 0) clean.max_price = params.max_price;
  if (typeof params.min_rating === 'number' && params.min_rating >= 0) clean.min_rating = params.min_rating;
  if (effectiveSort) clean.sort = effectiveSort;
  if (params.provider_type && params.provider_type !== 'ANY') clean.provider_type = params.provider_type;

  if (hasCompleteGeo) {
    clean.lat = params.lat!;
    clean.lng = params.lng!;
    clean.radius = Math.min(Math.round(params.radius!), 50000);
  }

  clean.page = params.page ?? 1;
  clean.limit = Math.min(params.limit ?? 20, 20);

  return clean;
}

export const searchApi = {
  /**
   * GET /api/v1/search/workers
   */
  searchWorkers: async (
    params: SearchWorkersParams,
    signal?: AbortSignal,
  ): Promise<PaginatedSearchResponse> => {
    const queryParams = sanitizeSearchParams(params);
    const response = await apiClient.get<PaginatedSearchResponse>('/search/workers', {
      params: queryParams,
      signal,
    });
    return response.data;
  },

  /**
   * GET /api/v1/search/autocomplete
   * Requires q.trim().length >= 2
   */
  getAutocomplete: async (
    q: string,
    limit: number = 8,
    signal?: AbortSignal,
  ): Promise<AutocompleteSuggestion[]> => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const response = await apiClient.get<{ success: true; data: AutocompleteSuggestion[] }>(
      '/search/autocomplete',
      {
        params: { q: trimmed.slice(0, 50), limit: Math.min(limit, 15) },
        signal,
      },
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/search/trending
   */
  getTrending: async (
    window: '24h' | '7d' = '24h',
    limit: number = 10,
    signal?: AbortSignal,
  ): Promise<TrendingTerm[]> => {
    const response = await apiClient.get<{ success: true; data: TrendingTerm[] }>(
      '/search/trending',
      {
        params: { window, limit: Math.min(limit, 20) },
        signal,
      },
    );
    return response.data.data;
  },
};
```

---

### Step 4: Create React Query Hooks (`src/hooks/useSearch.ts`)

Use `@tanstack/react-query` with `AbortSignal` forwarding so outdated in-flight requests are automatically cancelled as the user types or changes filters.

```typescript
// src/hooks/useSearch.ts
import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchApi } from '../services/api/search.api';
import { SearchWorkersParams } from '../types/search.types';

/**
 * Reusable debounce hook (default 250ms for autocomplete, 350ms for full search)
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Infinite paginated worker search hook (`GET /api/v1/search/workers`)
 * Automatically caps pagination at page 50 (search-service MAX_PAGE_NUMBER).
 */
export function useInfiniteWorkerSearch(filters: Omit<SearchWorkersParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['search', 'workers', filters],
    queryFn: ({ pageParam = 1, signal }) =>
      searchApi.searchWorkers({ ...filters, page: pageParam, limit: filters.limit ?? 20 }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.has_next && lastPage.meta.page < 50) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // Matches search-service 60s Redis cache TTL
  });
}

/**
 * Debounced autocomplete hook (`GET /api/v1/search/autocomplete`)
 * Only fires when debounced query is >= 2 characters.
 */
export function useSearchAutocomplete(rawQuery: string, limit: number = 8) {
  const debouncedQuery = useDebouncedValue(rawQuery.trim(), 250);

  return useQuery({
    queryKey: ['search', 'autocomplete', debouncedQuery, limit],
    queryFn: ({ signal }) => searchApi.getAutocomplete(debouncedQuery, limit, signal),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Trending search terms hook (`GET /api/v1/search/trending`)
 */
export function useTrendingSearches(window: '24h' | '7d' = '24h', limit: number = 10) {
  return useQuery({
    queryKey: ['search', 'trending', window, limit],
    queryFn: ({ signal }) => searchApi.getTrending(window, limit, signal),
    staleTime: 5 * 60 * 1000, // Matches 300s Redis cache TTL
  });
}
```

---

### Step 5: Build the Search Screen & Result Cards (`app/(tabs)/search.tsx`)

```tsx
// Example integration in app/(tabs)/search.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useDebouncedValue,
  useInfiniteWorkerSearch,
  useSearchAutocomplete,
  useTrendingSearches,
} from '../../src/hooks/useSearch';
import {
  AutocompleteSuggestion,
  ProviderTypeFilter,
  SearchSortOption,
  WorkerSearchDocument,
} from '../../src/types/search.types';

export default function CustomerSearchScreen() {
  const router = useRouter();

  // Search & filter state
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [selectedCity, setSelectedCity] = useState<string | undefined>('Lahore');
  const [providerType, setProviderType] = useState<ProviderTypeFilter>('ANY');
  const [sort, setSort] = useState<SearchSortOption>('relevance');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedQuery = useDebouncedValue(searchInput, 350);

  // 1. Trending terms (displayed when search box is empty)
  const { data: trendingTerms = [] } = useTrendingSearches('24h', 8);

  // 2. Autocomplete suggestions (fires when searchInput >= 2 chars)
  const { data: suggestions = [] } = useSearchAutocomplete(searchInput, 8);

  // 3. Paginated worker & company search results
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteWorkerSearch({
    q: debouncedQuery || undefined,
    category_id: selectedCategoryId,
    city: selectedCity,
    provider_type: providerType,
    sort,
    limit: 20,
  });

  const workers = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const handleSelectSuggestion = (item: AutocompleteSuggestion) => {
    setShowSuggestions(false);
    if (item.type === 'category' && item.category_id) {
      setSelectedCategoryId(item.category_id);
      setSearchInput('');
    } else if (item.type === 'worker' && item.worker_id) {
      router.push(`/worker/${item.worker_id}`);
    }
  };

  const formatDistance = (meters?: number) => {
    if (meters === undefined) return null;
    return meters < 1000 ? `${meters} m away` : `${(meters / 1000).toFixed(1)} km away`;
  };

  const renderWorkerCard = ({ item }: { item: WorkerSearchDocument }) => {
    const displayName =
      item.provider_type === 'COMPANY' && item.business_name
        ? item.business_name
        : item.name;
    const distanceLabel = formatDistance(item.distance_meters);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/worker/${item.worker_id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.workerName}>{displayName}</Text>
          {item.provider_type === 'COMPANY' && (
            <View style={styles.companyBadge}>
              <Text style={styles.companyBadgeText}>
                {item.company_verified ? 'Verified Company' : 'Company'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.categoriesText}>{item.category_names.join(' • ')}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.ratingText}>
            ★ {item.avg_rating.toFixed(1)} ({item.total_reviews} reviews)
          </Text>
          {distanceLabel && <Text style={styles.distanceText}>• {distanceLabel}</Text>}
          <Text style={styles.responseText}>• ~{item.response_time_mins}m response</Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.priceText}>
            {item.min_price !== null
              ? `PKR ${item.min_price.toLocaleString()}${
                  item.max_price && item.max_price > item.min_price
                    ? ` - ${item.max_price.toLocaleString()}`
                    : '+'
                }`
              : 'Request Quote'}
          </Text>
          {item.is_busy && (
            <Text style={styles.busyPill}>Currently on a job (Book for later)</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search electrician, bijli, AC repair, plumber..."
        value={searchInput}
        onFocus={() => setShowSuggestions(true)}
        onChangeText={(text) => {
          setSearchInput(text);
          setShowSuggestions(text.trim().length >= 2);
        }}
      />

      {/* Autocomplete Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.autocompleteBox}>
          {suggestions.map((s, idx) => (
            <TouchableOpacity
              key={`${s.type}-${s.category_id ?? s.worker_id ?? idx}`}
              style={styles.suggestionRow}
              onPress={() => handleSelectSuggestion(s)}
            >
              <Text style={styles.suggestionLabel}>
                {s.label} {s.label_ur ? `(${s.label_ur})` : ''}
              </Text>
              <Text style={styles.suggestionType}>
                {s.type === 'category' ? 'Category' : 'Professional'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Trending Search Chips when input is empty */}
      {!searchInput.trim() && trendingTerms.length > 0 && (
        <View style={styles.trendingWrap}>
          <Text style={styles.trendingTitle}>Trending Now:</Text>
          <View style={styles.chipsRow}>
            {trendingTerms.map((t) => (
              <TouchableOpacity
                key={t.term}
                style={styles.chip}
                onPress={() => setSearchInput(t.term)}
              >
                <Text style={styles.chipText}>{t.term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results List */}
      {isLoading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(item) => item.worker_id}
          renderItem={renderWorkerCard}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  autocompleteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionLabel: { fontSize: 14, color: '#111827', fontWeight: '500' },
  suggestionType: { fontSize: 12, color: '#6B7280' },
  trendingWrap: { marginTop: 12, marginBottom: 8 },
  trendingTitle: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  companyBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  companyBadgeText: { fontSize: 11, fontWeight: '600', color: '#1D4ED8' },
  categoriesText: { fontSize: 13, color: '#4B5563', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#D97706' },
  distanceText: { fontSize: 13, color: '#6B7280' },
  responseText: { fontSize: 13, color: '#059669' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  priceText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  busyPill: { fontSize: 12, color: '#B45309', fontWeight: '500' },
});
```

---

## 6. Phased Implementation Checklist for `tasklync-customer-app`

| Phase | Deliverable | Key Acceptance Criteria |
| :--- | :--- | :--- |
| **Phase 1: Gateway & Auth Plumbing** | `src/services/api/client.ts` | Requests route through API Gateway (`:3000`); optional JWT Bearer token is sent on `/api/v1/search/*` when logged in so blocked workers are hidden. |
| **Phase 2: API & Sanitizer Layer** | `src/types/search.types.ts` & `src/services/api/search.api.ts` | `lat`/`lng`/`radius` are always sent as a complete trio or omitted; `sort=distance` automatically falls back to `relevance` if GPS permission is denied. |
| **Phase 3: Autocomplete & Trending** | `useSearchAutocomplete` & `useTrendingSearches` | Autocomplete debounced by `250ms` and only fires at `>= 2` characters; Urdu (`label_ur`) and English labels rendered; trending chips populate empty search state. |
| **Phase 4: Filters & Infinite List** | `useInfiniteWorkerSearch` & `SearchFilterSheet` | Supports `category_id`, `city`, `min_price`, `max_price`, `min_rating`, `provider_type` (`INDIVIDUAL` / `COMPANY` / `ANY`), `radius`, and `sort`. Stops pagination at `page = 50`. |
| **Phase 5: Provider & Signal UI** | `WorkerSearchCard` | Renders `business_name` + `company_verified` badge for companies, `badges` (`top_rated`, `background_verified`), `is_busy` notice, `response_time_mins`, and rounded `distance_meters`. |
