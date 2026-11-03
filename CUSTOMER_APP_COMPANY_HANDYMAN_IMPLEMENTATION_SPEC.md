# 📱 TaskLync Customer App — Company Handyman & Agency Implementation Blueprint

> **Role:** Lead Mobile UI/UX Architect & Senior React Native Systems Engineer  
> **Target Audience:** React Native Engineers, UI/UX Product Designers, Mobile QA Engineers, Product Managers  
> **Platform:** React Native (Expo / Bare CLI) + TypeScript + React Query + Zustand  
> **Specification Version:** 2.0.0 (Architecture & Logic Specification — Zero Code Bloat)  
> **System Architecture Compatibility:** TaskLync Microservices API Gateway v2.0 (`booking-service`, `worker-service`, `search-service`)  

---

## 📋 Table of Contents
1. [Executive Summary & Customer Experience (CX) Philosophy](#1-executive-summary--customer-experience-cx-philosophy)
2. [Complete Files Inventory (Modified vs New)](#2-complete-files-inventory-modified-vs-new)
3. [Information Architecture & Component Hierarchy](#3-information-architecture--component-hierarchy)
4. [Data Contracts & Schema Interfaces](#4-data-contracts--schema-interfaces)
5. [Logic & Behavioral Specifications](#5-logic--behavioral-specifications)
   - 5.1. Search & Discovery Logic
   - 5.2. Provider Profile Logic
   - 5.3. Checkout & Reassurance Logic
   - 5.4. Active Tracking & Dispatched Technician Logic
   - 5.5. Reassignment Live Alert Logic
   - 5.6. Dual-Channel Communication & Phone Logic
   - 5.7. Real-Time Socket.IO Synchronization Logic
   - 5.8. Review & Rating Logic
6. [Customer Safety, Trust & Escrow Guarantee Model](#6-customer-safety-trust--escrow-guarantee-model)
7. [Offline Resilience & Edge Cases Matrix](#7-offline-resilience--edge-cases-matrix)
8. [QA Acceptance Criteria & Verification Checklist](#8-qa-acceptance-criteria--verification-checklist)

---

## 1. Executive Summary & Customer Experience (CX) Philosophy

In Pakistani on-demand home service marketplaces (Lahore, Karachi, Islamabad), customers experience two core anxieties when booking home maintenance:
1. **Safety & Identity Verification:** *"Who is physically entering my home? Can I verify their identity and phone number before opening the door?"*
2. **Accountability & Quality Guarantee:** *"If a solo technician does a substandard job or disappears, who takes responsibility?"*

TaskLync resolves both concerns by introducing **Handyman Companies & Agencies (`COMPANY`)** alongside trusted **Independent Craftsmen (`INDIVIDUAL`)**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CUSTOMER PERCEPTION & JOURNEY                             │
└────────────────────────────────────────────────────────────────────────────────────────┘

        INDEPENDENT WORKER (Solo)                     HANDYMAN AGENCY / COMPANY
  ┌────────────────────────────────────┐        ┌────────────────────────────────────┐
  │ • One-on-one personal craftsman    │        │ • Corporate service firm           │
  │ • Direct chat & call with craftsman│        │ • Enterprise warranty & guarantee  │
  │ • Flexible & personalized service  │        │ • Multi-technician fleet capacity  │
  │ • Transparent hourly/fixed price   │        │ • Dispatches vetted technician     │
  └─────────────────┬──────────────────┘        └─────────────────┬──────────────────┘
                    │                                             │
                    ▼                                             ▼
          1-Tap Instant Booking                         1-Tap Agency Booking
                    │                                             │
                    ▼                                             ▼
           Worker Arrives Directly                    Agency Assigns Technician:
                                                  ┌──────────────────────────────────┐
                                                  │ 🏢 FixIt Pro Handyman Services   │
                                                  │ 👷 On-Site: Tariq Mehmood        │
                                                  │ 📞 Direct Call / WhatsApp        │
                                                  └──────────────────────────────────┘
```

### 🎯 Key UI/UX Principles for the Customer App

1. **Zero Customer Ambiguity (Dual-Entity Clarity):**
   When a company is booked, the UI makes a crystalline distinction between:
   - **The Contracting Entity (Company):** e.g., *"Al-Madina Electric & Maintenance Pvt Ltd"* (holds the escrow contract, handles billing, backs the warranty).
   - **The Field Technician (On-Site Worker):** e.g., *"Muhammad Tariq"* (the actual vetted individual walking through the customer's front door with a toolbag).

2. **Dual-Channel Communication:**
   - **In-App Chat:** Connects directly with the **Company Dispatcher / Office Support** (for scheduling changes, invoices, complaints).
   - **Direct Call / WhatsApp Button:** Triggers a native dialer or WhatsApp chat with the **Field Technician** (`assigned_worker_phone`) who is actively on the road.

3. **Reassignment Grace & Real-Time Security:**
   If an agency replaces a technician before or during a job (e.g., flat tire, emergency), the customer receives an instant **Haptic Animated Banner** on their tracking screen displaying the new technician's verified name, photo placeholder, and direct phone number.

4. **Equal Footing & Non-Conflicting Discovery:**
   Solo workers and agencies coexist naturally. The search screen lets customers filter by preference (`All`, `Independent Craftsmen`, `Registered Agencies`) without penalizing solo workers.

---

## 2. Complete Files Inventory (Modified vs New)

### 2.1 Existing Files to Modify

| File Path | Description of Changes | Logic & State Impact |
| :--- | :--- | :--- |
| `src/types/worker.types.ts` | Add `provider_type`, `business_name`, `ntn_number`, `max_concurrent_jobs`, `company_verified_at`, `is_company`. | Strongly types provider responses across search and profile. |
| `src/types/booking.types.ts` | Add `provider_type`, `provider_name`, `provider_avatar_url`, `assigned_worker_name`, `assigned_worker_phone`, `is_company`, `assignee`. | Powers the dual-entity tracking and technician card. |
| `src/types/search.types.ts` | Add `provider_type?: 'INDIVIDUAL' \| 'COMPANY'` to query filter params and response hits. | Allows search engine filtering by provider model. |
| `src/services/api/searchApi.ts` | Append `provider_type` query parameter to the worker search request. | Routes filter to backend PostgreSQL/Elasticsearch. |
| `src/components/search/WorkerCard.tsx` | Add company badge rendering, display `business_name` for companies, and show fleet size indicator. | Differentiates agencies while keeping card layout uniform. |
| `src/screens/search/WorkerSearchScreen.tsx` | Integrate `ProviderTypeFilterChips` into the sticky filter bar. | Enables 1-tap switching between All, Solo, and Agency providers. |
| `src/screens/worker/WorkerProfileScreen.tsx` | Display agency credentials, NTN verification tag, company guarantee card, and fleet overview. | Establishes trust before booking. |
| `src/screens/booking/CreateBookingScreen.tsx` | Add agency booking disclosure and optional dispatch notes for the technician. | Sets expectations about technician dispatch. |
| `src/screens/booking/BookingDetailScreen.tsx` | Conditionally render `DispatchedTechnicianCard` and `TechnicianReassignedBanner` when `booking.is_company` is true. | Core tracking screen for active agency bookings. |
| `src/screens/chat/ChatScreen.tsx` | Add "Support Office / Dispatch" subtitle when chatting with a company account. | Clarifies who is chatting on behalf of the company. |
| `src/screens/review/CreateReviewScreen.tsx` | Attribute the review to the company with an optional technician shout-out field. | Keeps agency reputation intact while evaluating field staff. |

---

### 2.2 New Files to Create

| File Path | Purpose | Key Responsibilities |
| :--- | :--- | :--- |
| `src/theme/companyTokens.ts` | Design tokens for enterprise & trust UI | Standardized color palette (Navy `#0F172A`, Blue `#2563EB`, Emerald `#059669`), typography scales, and shadows. |
| `src/utils/phone.utils.ts` | Phone parsing, formatting & deep linking | Normalizes Pakistani phone numbers to E.164, detects network carrier (Jazz, Zong, Telenor, Ufone), triggers native phone call and WhatsApp. |
| `src/components/company/CompanyBadge.tsx` | Reusable verification badge | Renders `micro` (for cards), `pill` (for filters), or `banner` (for profile headers). |
| `src/components/search/ProviderTypeFilterChips.tsx` | Filter pill selector component | Interactive horizontal scroll chips for `All`, `Solo Handymen`, and `Verified Agencies`. |
| `src/components/company/CompanyTrustGuaranteeCard.tsx` | Reassurance & warranty card | Explains TaskLync Escrow, background-checked staff, and 7-day workmanship guarantee. |
| `src/components/booking/DispatchedTechnicianCard.tsx` | Landmark on-site technician card | Displays technician name, photo, phone, 1-tap Call button, WhatsApp button, and doorstep safety checklist. |
| `src/components/booking/TechnicianReassignedBanner.tsx` | Animated alert banner | Slides down when the company reassigns a technician to notify the customer immediately. |
| `src/hooks/useBookingRealtimeUpdates.ts` | Socket.IO event hook | Listens for `booking.accepted`, `booking.reassigned`, `booking.status_changed` and triggers React Query cache invalidation. |

---

## 3. Information Architecture & Component Hierarchy

```
Customer App Root
│
├── Search & Discovery Flow
│   └── WorkerSearchScreen
│       ├── SearchBar
│       ├── ProviderTypeFilterChips [NEW] ── (All | Solo | Companies)
│       └── WorkerList
│           └── WorkerCard [MODIFIED]
│               ├── Avatar / Business Logo
│               ├── Display Name (business_name OR worker.name)
│               ├── CompanyBadge [NEW] (If provider_type === 'COMPANY')
│               └── Fleet Capacity Tag ("Team of 10+ Technicians")
│
├── Provider Profile Flow
│   └── WorkerProfileScreen [MODIFIED]
│       ├── ProfileHeader (Company Banner + NTN Verified Chip)
│       ├── CompanyTrustGuaranteeCard [NEW] (Escrow + Vetting + 7-Day Warranty)
│       ├── ServiceOfferingsList (Company service rates)
│       └── CompanyReviewsList (Aggregated agency ratings)
│
├── Booking & Checkout Flow
│   └── CreateBookingScreen [MODIFIED]
│       ├── ServiceSummary
│       ├── ProviderDisclosureCard ("Dispatched by [Company Name]")
│       └── DispatchNotesInput ("Special instructions for technician")
│
└── Active Booking & Tracking Flow
    └── BookingDetailScreen [MODIFIED]
        ├── TechnicianReassignedBanner [NEW] (Slide-down alert on reassignment)
        ├── BookingStatusStepper (PENDING ➔ ACCEPTED ➔ IN_PROGRESS ➔ COMPLETED)
        │
        ├── [IF is_company === true]:
        │   └── DispatchedTechnicianCard [NEW]
        │       ├── Agency Header ("Contracted: FixIt Pro Services")
        │       ├── Technician Info (Name, Photo, Carrier Badge)
        │       ├── Action Buttons (Call Technician | WhatsApp)
        │       └── Doorstep Verification Tip ("Verify phone before entry")
        │
        ├── [IF is_company === false]:
        │   └── SoloWorkerCard (Direct worker call/chat)
        │
        └── JobDetails & EscrowReleaseButton
```

---

## 4. Data Contracts & Schema Interfaces

### 4.1 Worker Public Profile (`src/types/worker.types.ts`)

```typescript
export type ProviderType = 'INDIVIDUAL' | 'COMPANY';

export interface WorkerPublicProfile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  verification_status: 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED';
  avg_rating: number;
  total_reviews: number;
  total_bookings: number;
  
  // ── Company / Agency Fields ──
  provider_type: ProviderType;          // 'INDIVIDUAL' | 'COMPANY'
  business_name: string | null;         // e.g. "FixIt Pro Handyman Services"
  ntn_number?: string | null;           // Verified tax registration number
  max_concurrent_jobs: number;          // Active technician fleet size (e.g. 10)
  company_verified_at: string | null;   // Timestamp of admin verification
  is_company: boolean;                  // Convenience boolean flag
}
```

### 4.2 Booking Detail (`src/types/booking.types.ts`)

```typescript
export interface BookingDispatchedTechnician {
  name: string;
  phone: string | null;
  dispatched_at?: string;
}

export interface BookingDetail {
  id: string;
  user_id: string;
  worker_id: string;
  category_id: string;
  service_id: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED_BY_WORKER' | 'COMPLETED' | 'CANCELLED';
  
  scheduled_at: string;
  duration_hours: number;
  address_text: string;
  estimated_total: number;
  currency: string;
  
  // ── Provider (Contracting Entity) ──
  provider_type: ProviderType;
  provider_name: string | null;
  provider_avatar_url: string | null;
  is_company: boolean;
  
  // ── Dispatched Technician (On-Site Field Worker) ──
  assigned_worker_name: string | null;
  assigned_worker_phone: string | null;
  assignee?: BookingDispatchedTechnician | null;
}
```

---

## 5. Logic & Behavioral Specifications

### 5.1 Search & Discovery Logic

1. **Default View (`ALL`):**
   - Returns both individual craftsmen and companies sorted by relevance, rating, and distance.
2. **Filtering by Provider Type:**
   - When customer taps **Solo Handymen**: API request appends `?provider_type=INDIVIDUAL`.
   - When customer taps **Verified Agencies**: API request appends `?provider_type=COMPANY`.
3. **Card Display Rules:**
   - If `worker.provider_type === 'COMPANY'`:
     - Primary title displays `worker.business_name` (falls back to `worker.name`).
     - Renders `CompanyBadge` (micro variant).
     - Subtitle displays: `Registered Agency • ${worker.max_concurrent_jobs}+ Field Technicians`.
   - If `worker.provider_type === 'INDIVIDUAL'`:
     - Primary title displays `worker.name`.
     - Subtitle displays: `Independent Craftsman • ${worker.years_experience} yrs exp`.

---

### 5.2 Provider Profile Logic

1. **Header Rendering:**
   - Displays business name prominently with an `NTN VERIFIED` chip if `company_verified_at` is populated.
   - Shows badge: *"Corporate Service Partner"*.
2. **Trust & Guarantee Injection:**
   - Displays `CompanyTrustGuaranteeCard` right above the service catalog to reassure the customer regarding background checks, escrow safety, and 7-day rework guarantees.
3. **Ratings & Reviews Aggregation:**
   - Reviews display company-level ratings. If a review mentions a specific technician, a sub-tag *"Technician on Job: [Name]"* is rendered.

---

### 5.3 Checkout & Reassurance Logic

1. **Disclosure Card:**
   - When booking a company, the checkout screen displays an informative reassurance box:
     > *"You are booking [Business Name]. Upon accepting your request, the agency will assign a verified field technician. You will receive their name and direct phone number immediately."*
2. **Technician Instructions Input:**
   - Provides an optional input field for the customer: *"Special instructions for technician (e.g. bring high ladder, ask guard for gate pass)"*. Stored in `booking.description`.

---

### 5.4 Active Tracking & Dispatched Technician Logic

The core state machine for company bookings on `BookingDetailScreen`:

```
                       ┌────────────────────────────────────────┐
                       │ Booking Status == 'PENDING'            │
                       │ Message: "Awaiting Agency Confirmation"│
                       └───────────────────┬────────────────────┘
                                           │
                                 Agency Accepts Job
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │ Booking Status == 'ACCEPTED'           │
                       │ Is booking.is_company == true?         │
                       └───────────────┬────────────────┬───────┘
                                       │                │
                                 NO (Solo Worker)  YES (Company)
                                       │                │
                                       ▼                ▼
                           ┌─────────────────┐ ┌───────────────────────────────────┐
                           │ Render Solo     │ │ Render DispatchedTechnicianCard:  │
                           │ Worker Card     │ │ • Agency: [Company Name]          │
                           │ (Direct Call)   │ │ • Tech: [assigned_worker_name]    │
                           └─────────────────┘ │ • Phone: [assigned_worker_phone]  │
                                               │ • 1-Tap Call & WhatsApp           │
                                               │ • Doorstep Security Verification  │
                                               └───────────────────────────────────┘
```

1. **Dispatched Technician Card Behavior:**
   - Only renders when `booking.is_company === true` AND `booking.assigned_worker_name` is non-null.
   - Displays the assigned worker's name and normalized Pakistani phone number.
   - Displays a carrier pill (Jazz / Zong / Telenor / Ufone) based on the phone prefix.
   - Provides two direct action buttons:
     - **Call Technician:** Initiates phone call to `assigned_worker_phone`.
     - **WhatsApp:** Opens WhatsApp conversation with pre-filled booking context.
   - Displays a security checklist: *"Verify technician name and phone before allowing entry into your home."*

---

### 5.5 Reassignment Live Alert Logic

When an agency replaces a technician while the booking is active:

1. **Socket.IO Event Ingestion:**
   - Event `booking.reassigned` is received with `{ new_worker_name, new_worker_phone, reason }`.
2. **Haptic & Visual Trigger:**
   - Device triggers a **Warning Haptic feedback**.
   - `TechnicianReassignedBanner` slides down from the top using spring animation:
     > *"Technician Reassigned: The agency updated your technician to [New Name]. Reason: [Reason]"*
3. **Reactive UI Update:**
   - React Query invalidates the booking cache.
   - `DispatchedTechnicianCard` updates its displayed name and phone number seamlessly without requiring a full screen reload.

---

### 5.6 Dual-Channel Communication & Phone Logic

1. **Separation of Concerns:**
   - **Support / Invoicing:** Handled via in-app chat. Chat header clearly indicates *"Chatting with [Company Name] Support Office"*.
   - **On-Site Coordination:** Handled via direct phone call or WhatsApp to the field technician on the road.
2. **Phone Parsing & Formatting Rules (`phone.utils.ts`):**
   - Strips spaces, dashes, parentheses.
   - Handles prefixes: `03XX`, `+923XX`, `00923XX`, `923XX`.
   - Formats for display: `0300 1234567`.
   - Formats for dialer intent: `tel:+923001234567`.
   - Formats for WhatsApp deep link: `whatsapp://send?phone=923001234567&text=[Encoded Greeting]`.

---

### 5.7 Real-Time Socket.IO Synchronization Logic

1. **Room Subscription:**
   - Upon mounting `BookingDetailScreen`, client emits `booking.join` with `{ booking_id }`.
2. **Handled Events:**
   - `booking.accepted`: Triggers success haptic; invalidates `['booking', id]` query.
   - `booking.reassigned`: Triggers warning haptic; updates assignee in cache; mounts `TechnicianReassignedBanner`.
   - `booking.status_changed`: Updates status stepper (`IN_PROGRESS`, `COMPLETED_BY_WORKER`).
3. **Room Cleanup:**
   - Emits `booking.leave` on screen unmount to prevent memory leaks and zombie listeners.

---

### 5.8 Review & Rating Logic

1. **Primary Attribution:**
   - Star rating (1 to 5) directly updates the company's `avg_rating` and `total_reviews`.
2. **Technician Recognition:**
   - Prompts an optional recommendation question: *"Would you recommend technician [Name]?"*
   - Gives the agency internal visibility into field staff performance while keeping public ratings consolidated at the company level.

---

## 6. Customer Safety, Trust & Escrow Guarantee Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TASKLYNC ESCROW & SAFETY PROTOCOL                    │
└────────────────────────────────────────────────────────────────────────┘

1. SECURE ESCROW DEPOSIT
   - Customer payment is locked in TaskLync platform escrow at checkout.
   - Funds are NEVER paid directly to the field technician on site.

2. AGENCY VETTING & NTN COMPLIANCE
   - Agency holds corporate legal responsibility for their technicians.
   - Verified NTN numbers are recorded with TaskLync compliance.

3. DOORSTEP IDENTITY VERIFICATION
   - Customer verifies technician's identity by cross-referencing:
     1. Name on the TaskLync App.
     2. Phone number on the TaskLync App.

4. COMPLETION CONFIRMATION & 7-DAY WARRANTY
   - Escrow funds are only released to the company wallet after customer taps "Confirm Completion".
   - If work is defective within 7 days, the agency must re-dispatch a technician free of charge.
```

---

## 7. Offline Resilience & Edge Cases Matrix

| Scenario / Edge Case | Potential Failure Point | App Self-Healing Logic |
| :--- | :--- | :--- |
| **Zero Internet at Doorstep** | Customer cannot view technician phone or name when technician arrives. | Active booking details and technician phone are cached in local persistent storage (MMKV) upon acceptance. Screen remains 100% viewable offline. |
| **Technician Reassigned in Transit** | Customer calls previous technician who cancelled. | Socket.IO pushes `booking.reassigned`. If offline, FCM high-priority push updates cache and triggers banner on reconnect. |
| **Technician Phone Switched Off** | Field technician is unreachable on mobile. | 1-tap `Support Office` button inside `DispatchedTechnicianCard` lets customer immediately ping the agency dispatcher. |
| **Customer Initiates Dispute** | Technician fails to arrive or damages property. | Dispute modal allows customer to freeze escrow release. Company manager is notified to resolve or issue refund. |

---

## 8. QA Acceptance Criteria & Verification Checklist

- [ ] **Search & Discovery:**
  - `All Providers` filter returns both individual workers and companies.
  - `Verified Agencies` filter returns only providers with `provider_type === 'COMPANY'`.
  - Company cards render `business_name`, `CompanyBadge`, and fleet size tag.
- [ ] **Provider Profile:**
  - Company profile displays `CompanyTrustGuaranteeCard` and NTN badge.
- [ ] **Job Acceptance Flow:**
  - When an individual worker accepts, `DispatchedTechnicianCard` is **not shown**.
  - When a company accepts, `DispatchedTechnicianCard` renders with the assigned worker's name and phone.
  - Tapping **Call Technician** opens native phone dialer with `+92...`.
  - Tapping **WhatsApp** launches WhatsApp with pre-filled greeting.
- [ ] **Technician Reassignment Flow:**
  - Triggering `booking.reassigned` displays `TechnicianReassignedBanner` with slide-down animation and haptic feedback.
  - Technician card updates to new name and phone without requiring screen refresh.
- [ ] **Escrow & Review Flow:**
  - Review submission rates the contracting company.
  - Escrow release credits the company wallet.
