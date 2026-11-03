# Review Service API & Customer App Integration Specification

> **Author:** Principal Backend & API Systems Architect  
> **Target Audience:** TaskLync Customer App Mobile Engineers, Frontend Developers, Backend Integrators  
> **Service:** `review-service` (TaskLync Microservices Ecosystem)  
> **API Gateway Base URL (HTTP):** `https://api.tasklync.pk/api/v1/reviews`  
> **Authentication:** Standard JWT Bearer Token (`Authorization: Bearer <ACCESS_TOKEN>`) with role `user`  
> **Upstream Internal Port:** `3013` (via Docker Internal Network)

---

## 1. Executive Summary & Architecture

The **TaskLync Review Service** is the trust-and-reputation engine of the TaskLync on-demand services marketplace. It enables customers to rate and review verified service professionals after booking completion, powers worker aggregate ratings, and provides automated and community moderation.

```
┌────────────────────────┐         Kafka Event         ┌─────────────────────────┐
│     Booking Service    │ ──────────────────────────> │      Review Service     │
│  (booking.completed)   │  topic: booking.events      │ (reviewable_bookings)   │
└────────────────────────┘                             └────────────┬────────────┘
                                                                    │
                                                Customer Submission │ (14-day window)
                                                                    ▼
                                                       ┌─────────────────────────┐
                                                       │   PostgreSQL & Redis    │
                                                       │ (reviews, summary cache)│
                                                       └────────────┬────────────┘
                                                                    │
                                          Outbox / Kafka Event      ▼
                                      review.submitted ───> ┌───────────────────┐
                                                            │   Worker Service  │
                                                            │(avg_rating updated)│
                                                            └───────────────────┘
```

### Core Business Rules & Guarantees:
1. **Verified Bookings Only:** A review can **only** be submitted for a booking that has reached terminal status (`COMPLETED` or `AUTO_COMPLETED`). The booking is asynchronously ingested from `booking.completed` Kafka events into `reviewable_bookings`.
2. **Review Window:** Customers have **14 days** (`REVIEW_WINDOW_DAYS = 14`) from booking completion to submit a review. Expired windows are rejected with HTTP 422 (`REVIEW_WINDOW_EXPIRED`).
3. **Customer Edit Window:** Once submitted, a customer can edit their review within **48 hours** (`REVIEW_EDIT_WINDOW_HOURS = 48`). After 48 hours, reviews are permanently locked.
4. **Worker Reply Window:** Assigned professionals have **30 days** (`WORKER_REPLY_WINDOW_DAYS = 30`) to post a single public rebuttal/thank-you response.
5. **Community Moderation:** Reviews that receive **3 or more reports** (`AUTO_HIDE_REPORT_THRESHOLD = 3`) are automatically transitioned to `AUTO_HIDDEN` status pending admin review.
6. **Multi-Tier Caching:** Worker rating distributions and averages are cached in Redis (`RATING_SUMMARY_CACHE_TTL_SECONDS = 300`) and atomically invalidated whenever a review is created, edited, or hidden.

---

## 2. Authentication & Gateway Headers

All authenticated requests must go through the API Gateway or supply valid JWT authentication.

### HTTP Headers
| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Yes** (Protected endpoints) | Bearer token: `Bearer <CUSTOMER_JWT_ACCESS_TOKEN>` |
| `Content-Type` | `string` | **Yes** | `application/json` (or `multipart/form-data` for media upload) |
| `X-User-Id` | `string` (UUID) | Injected by Gateway | Authenticated customer UUID |
| `X-User-Role` | `string` | Injected by Gateway | Role claim (must be `user`) |

---

## 3. Review Service Endpoints Catalog

| Method | Endpoint | Auth Required | Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/v1/reviews/booking/:bookingId/eligibility` | **Yes** | `user` | Check if booking can be reviewed & deadline |
| `POST` | `/api/v1/reviews/media` | **Yes** | `user` | Upload review photo to Cloudinary CDN |
| `POST` | `/api/v1/reviews` | **Yes** | `user` | Submit new customer review |
| `PATCH` | `/api/v1/reviews/:id` | **Yes** | `user` | Edit rating, comment, or tags (within 48h) |
| `GET` | `/api/v1/reviews/:id` | No | Public | Fetch single review details |
| `GET` | `/api/v1/reviews/worker/:workerId` | No | Public | List paginated reviews for a worker |
| `GET` | `/api/v1/reviews/worker/:workerId/summary` | No | Public | Get aggregate rating, star breakdown & top tags |
| `GET` | `/api/v1/reviews/user/:userId` | **Yes** | `user` | List reviews submitted by authenticated user |
| `POST` | `/api/v1/reviews/:id/report` | **Yes** | `user`/`worker` | Report an abusive or fake review |

---

## 4. Detailed Endpoint Specifications

### 4.1. Check Review Eligibility
Checks whether a booking is eligible for review, if a review has already been submitted, and the expiration timestamp.

- **Route:** `GET /api/v1/reviews/booking/:bookingId/eligibility`
- **Auth:** `Bearer <JWT_TOKEN>` (`role: "user"`)
- **Path Parameters:**
  - `bookingId` (`string`, UUID v4, required): The booking identifier.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "booking_id": "6dfcf076-aada-4db5-9183-32082d0bf4f6",
    "status": "ELIGIBLE",
    "review_deadline": "2026-10-23T09:31:50.855Z",
    "already_reviewed": false
  }
}
```

#### Status Values
- `ELIGIBLE`: Ready to be reviewed.
- `REVIEWED`: Review already submitted.
- `EXPIRED`: 14-day window has elapsed.

---

### 4.2. Upload Review Photo
Uploads an image to Cloudinary storage and returns the permanent CDN URL for inclusion in review submissions.

- **Route:** `POST /api/v1/reviews/media`
- **Auth:** `Bearer <JWT_TOKEN>` (`role: "user"`)
- **Content-Type:** `multipart/form-data`
- **Payload:**
  - `photo` (File binary, required): File format `image/jpeg`, `image/png`, or `image/webp`. Max size: **8 MB**.
  - `booking_id` (`string`, optional): Associated booking UUID for folder categorization.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "photo_url": "https://res.cloudinary.com/tasklync/image/upload/v1728468712/tasklync/reviews/6dfcf076-aada-4db5-9183-32082d0bf4f6/photo_1.jpg"
  }
}
```

---

### 4.3. Submit Review
Submits a rating, comment, tags, and photos for a verified booking.

- **Route:** `POST /api/v1/reviews`
- **Auth:** `Bearer <JWT_TOKEN>` (`role: "user"`)
- **Content-Type:** `application/json`

#### Request Body Schema
```json
{
  "booking_id": "6dfcf076-aada-4db5-9183-32082d0bf4f6",
  "rating": 5,
  "comment": "Tariq arrived right on time, had all necessary tools, and fixed the pipe leak in under an hour. Excellent service!",
  "tags": [
    "punctual",
    "skilled",
    "clean"
  ],
  "photo_urls": [
    "https://res.cloudinary.com/tasklync/image/upload/v1728468712/tasklync/reviews/6dfcf076-aada-4db5-9183-32082d0bf4f6/photo_1.jpg"
  ]
}
```

#### Field Specifications:
| Field | Type | Required | Constraints |
| :--- | :--- | :---: | :--- |
| `booking_id` | `string` (UUID) | **Yes** | Must match completed booking belonging to caller |
| `rating` | `integer` | **Yes** | Min `1`, Max `5` (whole stars) |
| `comment` | `string` | No | Max `2000` characters |
| `tags` | `string[]` | No | Valid values: `punctual`, `professional`, `good_value`, `clean`, `skilled`, `friendly` |
| `photo_urls` | `string[]` | No | Max `5` valid Cloudinary URLs |

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "e4b2d56a-1122-4433-8899-abcdef123456",
    "booking_id": "6dfcf076-aada-4db5-9183-32082d0bf4f6",
    "user_id": "7d0875f1-9b62-4ed5-8bf6-9be508f20824",
    "worker_id": "d59aaa78-1812-405b-bfe5-6d363a386830",
    "rating": 5,
    "comment": "Tariq arrived right on time, had all necessary tools, and fixed the pipe leak in under an hour. Excellent service!",
    "tags": ["punctual", "skilled", "clean"],
    "photo_urls": [
      "https://res.cloudinary.com/tasklync/image/upload/v1728468712/tasklync/reviews/6dfcf076-aada-4db5-9183-32082d0bf4f6/photo_1.jpg"
    ],
    "worker_reply": null,
    "worker_replied_at": null,
    "moderation_status": "VISIBLE",
    "report_count": 0,
    "edited_at": null,
    "created_at": "2026-10-09T08:30:00.000Z",
    "updated_at": "2026-10-09T08:30:00.000Z"
  }
}
```

---

### 4.4. Edit Review
Allows the author to edit rating, comment, or tags within 48 hours of creation.

- **Route:** `PATCH /api/v1/reviews/:id`
- **Auth:** `Bearer <JWT_TOKEN>` (`role: "user"`)
- **Path Parameters:**
  - `id` (`string`, UUID): The review ID.

#### Request Body Schema
```json
{
  "rating": 4,
  "comment": "Updated comment: Work was great, but cleanup took a bit longer.",
  "tags": ["skilled", "friendly"]
}
```
*(At least one field is required. Photos cannot be modified after initial submission).*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "e4b2d56a-1122-4433-8899-abcdef123456",
    "rating": 4,
    "comment": "Updated comment: Work was great, but cleanup took a bit longer.",
    "tags": ["skilled", "friendly"],
    "edited_at": "2026-10-09T09:15:00.000Z",
    "updated_at": "2026-10-09T09:15:00.000Z"
  }
}
```

---

### 4.5. List Reviews for a Worker (Public Profile)
Fetches visible customer reviews for a service professional with cursor pagination and optional star rating filter.

- **Route:** `GET /api/v1/reviews/worker/:workerId`
- **Auth:** Public
- **Path Parameters:**
  - `workerId` (`string`, UUID): Professional's worker ID.
- **Query Parameters:**
  - `limit` (`integer`, optional, default `20`, max `50`): Number of reviews per page.
  - `cursor` (`string`, UUID, optional): Last review ID from previous page.
  - `rating` (`integer`, optional, `1` to `5`): Filter reviews by star rating.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "e4b2d56a-1122-4433-8899-abcdef123456",
      "booking_id": "6dfcf076-aada-4db5-9183-32082d0bf4f6",
      "user_id": "7d0875f1-9b62-4ed5-8bf6-9be508f20824",
      "worker_id": "d59aaa78-1812-405b-bfe5-6d363a386830",
      "rating": 5,
      "comment": "Great experience with Tariq. Very professional.",
      "tags": ["punctual", "professional"],
      "photo_urls": [],
      "worker_reply": "Thank you for choosing TaskLync! Happy to help anytime.",
      "worker_replied_at": "2026-10-09T10:00:00.000Z",
      "moderation_status": "VISIBLE",
      "report_count": 0,
      "edited_at": null,
      "created_at": "2026-10-09T08:30:00.000Z",
      "updated_at": "2026-10-09T10:00:00.000Z"
    }
  ],
  "meta": {
    "next_cursor": "e4b2d56a-1122-4433-8899-abcdef123456",
    "has_more": false
  }
}
```

---

### 4.6. Get Worker Rating Summary & Distribution
Fetches calculated rating metrics, 5-star distribution breakdown, and most frequent customer tags. Ideal for worker profile headers.

- **Route:** `GET /api/v1/reviews/worker/:workerId/summary`
- **Auth:** Public
- **Path Parameters:**
  - `workerId` (`string`, UUID): Professional's worker ID.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "worker_id": "d59aaa78-1812-405b-bfe5-6d363a386830",
    "average": 4.85,
    "total": 34,
    "distribution": {
      "5": 30,
      "4": 3,
      "3": 1,
      "2": 0,
      "1": 0
    },
    "top_tags": [
      { "tag": "punctual", "count": 28 },
      { "tag": "skilled", "count": 24 },
      { "tag": "clean", "count": 19 }
    ]
  }
}
```

---

### 4.7. List Customer's Own Reviews
Retrieves history of reviews authored by the authenticated customer.

- **Route:** `GET /api/v1/reviews/user/:userId`
- **Auth:** `Bearer <JWT_TOKEN>` (`role: "user"`, `:userId` must match token)
- **Query Parameters:**
  - `limit` (`integer`, optional, default `20`)
  - `cursor` (`string`, UUID, optional)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "e4b2d56a-1122-4433-8899-abcdef123456",
      "booking_id": "6dfcf076-aada-4db5-9183-32082d0bf4f6",
      "worker_id": "d59aaa78-1812-405b-bfe5-6d363a386830",
      "rating": 5,
      "comment": "Excellent service!",
      "tags": ["punctual"],
      "photo_urls": [],
      "worker_reply": null,
      "created_at": "2026-10-09T08:30:00.000Z"
    }
  ],
  "meta": {
    "next_cursor": null,
    "has_more": false
  }
}
```

---

### 4.8. Report Inappropriate Review
Allows a customer or worker to report an inappropriate, abusive, or fake review.

- **Route:** `POST /api/v1/reviews/:id/report`
- **Auth:** `Bearer <JWT_TOKEN>` (`role: "user"` or `role: "worker"`)
- **Content-Type:** `application/json`

#### Request Body Schema
```json
{
  "reason": "OFFENSIVE_LANGUAGE",
  "note": "Review contains abusive verbal language."
}
```

#### Valid Reasons:
- `SPAM`
- `OFFENSIVE_LANGUAGE`
- `FAKE_REVIEW`
- `UNRELATED_CONTENT`
- `PERSONAL_INFO`
- `OTHER`

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "rep_99887766-5544-3322-1100-aabbccddeeff",
    "review_id": "e4b2d56a-1122-4433-8899-abcdef123456",
    "reported_by": "7d0875f1-9b62-4ed5-8bf6-9be508f20824",
    "reporter_role": "user",
    "reason": "OFFENSIVE_LANGUAGE",
    "note": "Review contains abusive verbal language.",
    "created_at": "2026-10-09T10:15:00.000Z"
  }
}
```

---

## 5. Error Codes & Handling Reference

Review Service standardizes on RFC-compliant HTTP error envelopes:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable error description",
    "details": {}
  }
}
```

| HTTP Status | Error Code | Meaning & Mobile App Handling |
| :---: | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Request payload failed Zod schema (e.g. invalid rating or comment > 2000 chars). Display field error. |
| `400` | `TOO_MANY_PHOTOS` | More than 5 photos attached. Advise user to remove photos. |
| `401` | `UNAUTHORIZED` | Token missing or expired. Redirect to customer login sheet. |
| `403` | `FORBIDDEN` / `REVIEW_ACCESS_DENIED` | Customer is trying to edit or view another customer's private review. |
| `404` | `BOOKING_NOT_REVIEWABLE` | Booking is not in `COMPLETED` state yet. Do not display review prompt. |
| `404` | `REVIEW_NOT_FOUND` | Review ID does not exist. |
| `409` | `REVIEW_ALREADY_EXISTS` | Customer has already reviewed this booking. Navigate to view/edit review. |
| `409` | `REPORT_ALREADY_EXISTS` | User has already reported this review. Show toast "Already reported". |
| `413` | `MEDIA_TOO_LARGE` | Uploaded image > 8MB. Compress image before uploading. |
| `422` | `REVIEW_WINDOW_EXPIRED` | 14-day window passed. Inform customer review period has closed. |
| `422` | `EDIT_WINDOW_EXPIRED` | 48-hour edit window passed. Disable "Edit" button. |

---

## 6. TaskLync Customer App Integration Guide

Follow this guide to connect the TaskLync Customer Mobile App (React Native / Expo).

### 6.1. Types Definition (`src/types/review.types.ts`)

```typescript
export type ReviewTag =
  | 'punctual'
  | 'professional'
  | 'good_value'
  | 'clean'
  | 'skilled'
  | 'friendly';

export type ReportReason =
  | 'SPAM'
  | 'OFFENSIVE_LANGUAGE'
  | 'FAKE_REVIEW'
  | 'UNRELATED_CONTENT'
  | 'PERSONAL_INFO'
  | 'OTHER';

export interface ReviewItem {
  id: string;
  booking_id: string;
  user_id: string;
  worker_id: string;
  rating: number;
  comment?: string | null;
  tags: ReviewTag[];
  photo_urls: string[];
  worker_reply?: string | null;
  worker_replied_at?: string | null;
  moderation_status: 'VISIBLE' | 'AUTO_HIDDEN' | 'ADMIN_HIDDEN' | 'ADMIN_RESTORED';
  edited_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewEligibility {
  booking_id: string;
  status: 'ELIGIBLE' | 'REVIEWED' | 'EXPIRED';
  review_deadline: string;
  already_reviewed: boolean;
}

export interface WorkerRatingSummary {
  worker_id: string;
  average: number;
  total: number;
  distribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
  top_tags: Array<{ tag: ReviewTag; count: number }>;
}

export interface CreateReviewPayload {
  booking_id: string;
  rating: number;
  comment?: string;
  tags?: ReviewTag[];
  photo_urls?: string[];
}

export interface EditReviewPayload {
  rating?: number;
  comment?: string;
  tags?: ReviewTag[];
}
```

---

### 6.2. API Client Service (`src/services/api/review.api.ts`)

```typescript
import { apiClient } from './client';
import {
  ReviewItem,
  ReviewEligibility,
  WorkerRatingSummary,
  CreateReviewPayload,
  EditReviewPayload,
  ReportReason,
} from '../../types/review.types';

export const reviewApi = {
  /**
   * Check if a completed booking is eligible for customer review
   */
  checkEligibility: async (bookingId: string): Promise<ReviewEligibility> => {
    const res = await apiClient.get<{ success: boolean; data: ReviewEligibility }>(
      `/reviews/booking/${bookingId}/eligibility`
    );
    return res.data.data;
  },

  /**
   * Upload single review photo before submitting review
   */
  uploadPhoto: async (bookingId: string, fileUri: string): Promise<string> => {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri: fileUri,
      name: filename,
      type,
    } as any);
    formData.append('booking_id', bookingId);

    const res = await apiClient.post<{ success: boolean; data: { photo_url: string } }>(
      '/reviews/media',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data.photo_url;
  },

  /**
   * Submit review for a booking
   */
  submitReview: async (payload: CreateReviewPayload): Promise<ReviewItem> => {
    const res = await apiClient.post<{ success: boolean; data: ReviewItem }>(
      '/reviews',
      payload
    );
    return res.data.data;
  },

  /**
   * Edit an existing review (allowed within 48h)
   */
  editReview: async (reviewId: string, payload: EditReviewPayload): Promise<ReviewItem> => {
    const res = await apiClient.patch<{ success: boolean; data: ReviewItem }>(
      `/reviews/${reviewId}`,
      payload
    );
    return res.data.data;
  },

  /**
   * Fetch worker review summary & rating distribution
   */
  getWorkerSummary: async (workerId: string): Promise<WorkerRatingSummary> => {
    const res = await apiClient.get<{ success: boolean; data: WorkerRatingSummary }>(
      `/reviews/worker/${workerId}/summary`
    );
    return res.data.data;
  },

  /**
   * Fetch paginated reviews for a worker
   */
  getWorkerReviews: async (
    workerId: string,
    cursor?: string,
    rating?: number,
    limit: number = 20
  ): Promise<{ data: ReviewItem[]; next_cursor?: string; has_more: boolean }> => {
    const res = await apiClient.get<{
      success: boolean;
      data: ReviewItem[];
      meta?: { next_cursor?: string; has_more: boolean };
    }>(`/reviews/worker/${workerId}`, {
      params: { cursor, rating, limit },
    });
    return {
      data: res.data.data,
      next_cursor: res.data.meta?.next_cursor,
      has_more: Boolean(res.data.meta?.has_more),
    };
  },

  /**
   * Report inappropriate review
   */
  reportReview: async (reviewId: string, reason: ReportReason, note?: string): Promise<void> => {
    await apiClient.post(`/reviews/${reviewId}/report`, { reason, note });
  },
};
```

---

### 6.3. React Query Custom Hooks (`src/hooks/useReview.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../services/api/review.api';
import { CreateReviewPayload, EditReviewPayload } from '../types/review.types';

export function useReviewEligibility(bookingId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['review-eligibility', bookingId],
    queryFn: () => reviewApi.checkEligibility(bookingId),
    enabled: Boolean(bookingId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useWorkerReviewSummary(workerId: string) {
  return useQuery({
    queryKey: ['worker-review-summary', workerId],
    queryFn: () => reviewApi.getWorkerSummary(workerId),
    enabled: Boolean(workerId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => reviewApi.submitReview(payload),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-review-summary', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-reviews', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', data.booking_id] });
    },
  });
}

export function useEditReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: EditReviewPayload }) =>
      reviewApi.editReview(reviewId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worker-review-summary', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-reviews', data.worker_id] });
    },
  });
}
```

---

### 6.4. Post-Booking Review Prompt Integration

In the Customer App's **Booking Details Screen** (`app/booking/[id].tsx`), present the Review CTA when the booking is `COMPLETED`:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { useReviewEligibility } from '@/hooks/useReview';
import { router } from 'expo-router';

export function BookingReviewPrompt({ bookingId, workerId }: { bookingId: string; workerId: string }) {
  const { data: eligibility, isLoading } = useReviewEligibility(bookingId);

  if (isLoading || !eligibility || eligibility.status !== 'ELIGIBLE' || eligibility.already_reviewed) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.iconCircle}>
        <Star size={20} color="#F59E0B" fill="#F59E0B" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>How was your service?</Text>
        <Text style={styles.subtitle}>Rate your professional to help the community.</Text>
      </View>
      <TouchableOpacity
        style={styles.rateBtn}
        onPress={() => router.push({
          pathname: '/booking/[id]/review',
          params: { id: bookingId, workerId },
        })}
      >
        <Text style={styles.rateBtnText}>Rate Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  subtitle: { fontSize: 12, color: '#B45309', marginTop: 2 },
  rateBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rateBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});
```

---

## 7. Operational & Security Checklist

1. **Idempotent Ingestion:** The booking service Kafka producer issues `booking.completed` events that the review service consumes idempotently (`ON CONFLICT (booking_id) DO NOTHING` on `reviewable_bookings`).
2. **CDN Assets:** All uploaded photos are streamed securely into Cloudinary using server-side signatures; customer apps never receive raw Cloudinary API secrets.
3. **Rating Recalculation:** When a review is added or edited, `review-service` computes the worker's average rating using SQL precision and issues a `review.submitted` / `review.updated` event to keep `worker-service` profile caches completely synchronised.
4. **Graceful Fallbacks:** The review summary endpoint utilizes Redis caching with automatic DB recalculation fallback to withstand traffic spikes on popular worker profiles.
