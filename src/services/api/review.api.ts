import { apiClient } from './client';
import {
  ReviewItem,
  ReviewEligibility,
  WorkerRatingSummary,
  CreateReviewPayload,
  EditReviewPayload,
  ReportReviewPayload,
  PendingReviewItem,
  ReviewSubmitPayload,
} from '../../types/review.types';

export const reviewApi = {
  /**
   * 4.1. Check if a booking is eligible for review, deadline, and existing submission
   * GET /api/v1/reviews/booking/:bookingId/eligibility
   */
  checkEligibility: async (bookingId: string): Promise<ReviewEligibility> => {
    const res = await apiClient.get<{ success: boolean; data: ReviewEligibility }>(
      `/reviews/booking/${bookingId}/eligibility`
    );
    return res.data?.data || res.data;
  },

  /**
   * 4.2. Upload single review photo before submitting review
   * POST /api/v1/reviews/media
   * Max 8 MB, jpeg/png/webp
   */
  uploadPhoto: async (bookingId: string, fileUri: string): Promise<string> => {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const extension = match ? match[1].toLowerCase() : 'jpg';
    let mimeType = 'image/jpeg';
    if (extension === 'png') mimeType = 'image/png';
    else if (extension === 'webp') mimeType = 'image/webp';

    formData.append('photo', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    if (bookingId) {
      formData.append('booking_id', bookingId);
    }

    const res = await apiClient.post<{ success: boolean; data: { photo_url: string } }>(
      '/reviews/media',
      formData
    );

    return res.data?.data?.photo_url || (res.data as any)?.photo_url;
  },

  /**
   * 4.3. Submit new customer review
   * POST /api/v1/reviews
   */
  submitReview: async (
    payload: CreateReviewPayload | ReviewSubmitPayload
  ): Promise<ReviewItem> => {
    const bookingId = (payload as CreateReviewPayload).booking_id || (payload as ReviewSubmitPayload).bookingId;
    const rating = Math.min(Math.max(Math.round(payload.rating), 1), 5);
    const comment = payload.comment?.trim() || undefined;
    const tags = payload.tags && payload.tags.length > 0 ? payload.tags : undefined;
    const photoUrls = (payload as CreateReviewPayload).photo_urls || (payload as ReviewSubmitPayload).photoUrls;

    const requestBody: CreateReviewPayload = {
      booking_id: bookingId,
      rating,
      comment,
      tags,
      photo_urls: photoUrls && photoUrls.length > 0 ? photoUrls.slice(0, 5) : undefined,
    };

    const res = await apiClient.post<{ success: boolean; data: ReviewItem }>(
      '/reviews',
      requestBody
    );
    return res.data?.data || res.data;
  },

  /**
   * 4.4. Edit an existing review (allowed within 48h of creation)
   * PATCH /api/v1/reviews/:id
   */
  editReview: async (
    reviewId: string,
    payload: EditReviewPayload
  ): Promise<ReviewItem> => {
    const requestBody: EditReviewPayload = {
      rating: payload.rating ? Math.min(Math.max(Math.round(payload.rating), 1), 5) : undefined,
      comment: payload.comment !== undefined ? payload.comment.trim() : undefined,
      tags: payload.tags,
    };

    const res = await apiClient.patch<{ success: boolean; data: ReviewItem }>(
      `/reviews/${reviewId}`,
      requestBody
    );
    return res.data?.data || res.data;
  },

  /**
   * 4.5. Fetch single review details
   * GET /api/v1/reviews/:id
   */
  getReviewById: async (reviewId: string): Promise<ReviewItem> => {
    const res = await apiClient.get<{ success: boolean; data: ReviewItem }>(
      `/reviews/${reviewId}`
    );
    return res.data?.data || res.data;
  },

  /**
   * 4.5. Fetch paginated reviews for a worker (cursor pagination & rating filter)
   * GET /api/v1/reviews/worker/:workerId
   */
  getWorkerReviews: async (
    workerId: string,
    options?: {
      cursor?: string | undefined;
      rating?: number | undefined;
      limit?: number | undefined;
    }
  ): Promise<{ reviews: ReviewItem[]; nextCursor?: string | undefined; hasMore: boolean }> => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: ReviewItem[];
        meta?: { next_cursor?: string; has_more: boolean };
      }>(`/reviews/worker/${workerId}`, {
        params: {
          cursor: options?.cursor,
          rating: options?.rating && options.rating > 0 ? options.rating : undefined,
          limit: options?.limit || 20,
        },
      });

      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      return {
        reviews: list,
        nextCursor: res.data?.meta?.next_cursor,
        hasMore: Boolean(res.data?.meta?.has_more),
      };
    } catch {
      return { reviews: [], hasMore: false };
    }
  },

  /**
   * 4.6. Get worker aggregate rating summary, distribution breakdown & top tags
   * GET /api/v1/reviews/worker/:workerId/summary
   */
  getWorkerSummary: async (workerId: string): Promise<WorkerRatingSummary> => {
    const res = await apiClient.get<{ success: boolean; data: WorkerRatingSummary }>(
      `/reviews/worker/${workerId}/summary`
    );
    return (
      res.data?.data ||
      res.data || {
        worker_id: workerId,
        average: 5.0,
        total: 0,
        distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
        top_tags: [],
      }
    );
  },

  /**
   * 4.7. List reviews submitted by authenticated customer
   * GET /api/v1/reviews/user/:userId
   */
  getUserReviews: async (
    userId: string,
    options?: {
      cursor?: string | undefined;
      limit?: number | undefined;
    }
  ): Promise<{ reviews: ReviewItem[]; nextCursor?: string | undefined; hasMore: boolean }> => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: ReviewItem[];
        meta?: { next_cursor?: string; has_more: boolean };
      }>(`/reviews/user/${userId}`, {
        params: {
          cursor: options?.cursor,
          limit: options?.limit || 20,
        },
      });

      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      return {
        reviews: list,
        nextCursor: res.data?.meta?.next_cursor,
        hasMore: Boolean(res.data?.meta?.has_more),
      };
    } catch {
      return { reviews: [], hasMore: false };
    }
  },

  /**
   * 4.8. Report an inappropriate or abusive review
   * POST /api/v1/reviews/:id/report
   */
  reportReview: async (
    reviewId: string,
    payload: ReportReviewPayload
  ): Promise<{ id: string; review_id: string }> => {
    const res = await apiClient.post<{
      success: boolean;
      data: { id: string; review_id: string };
    }>(`/reviews/${reviewId}/report`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Pending reviews fallback for home/bookings reminder
   * GET /api/v1/reviews/pending
   */
  getPendingReviews: async (): Promise<PendingReviewItem[]> => {
    try {
      const res = await apiClient.get<any>('/reviews/pending');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Dismiss a pending review prompt/reminder
   */
  dismissPendingReview: async (bookingId: string): Promise<boolean> => {
    try {
      await apiClient.post(`/reviews/pending/${bookingId}/dismiss`);
      return true;
    } catch {
      try {
        await apiClient.patch(`/reviews/pending/${bookingId}/dismiss`);
        return true;
      } catch {
        return true;
      }
    }
  },
};

/**
 * Standard RFC error extractor for Review Service responses
 */
export function extractReviewErrorMessage(error: any): string {
  const code = error?.response?.data?.error?.code || error?.response?.data?.code;
  const message = error?.response?.data?.error?.message || error?.response?.data?.message;

  switch (code) {
    case 'VALIDATION_ERROR':
      return message || 'Please check your review input (rating must be 1-5 stars, comment under 2000 characters).';
    case 'TOO_MANY_PHOTOS':
      return 'You can attach a maximum of 5 photos. Please remove extra photos.';
    case 'UNAUTHORIZED':
      return 'Session expired. Please log in again to submit your review.';
    case 'FORBIDDEN':
    case 'REVIEW_ACCESS_DENIED':
      return 'You do not have permission to modify this review.';
    case 'BOOKING_NOT_REVIEWABLE':
      return 'This booking is not completed yet and cannot be reviewed.';
    case 'REVIEW_NOT_FOUND':
      return 'The requested review could not be found.';
    case 'REVIEW_ALREADY_EXISTS':
      return 'You have already submitted a review for this booking.';
    case 'REPORT_ALREADY_EXISTS':
      return 'You have already reported this review.';
    case 'MEDIA_TOO_LARGE':
      return 'Image is too large (maximum size is 8 MB). Please pick a smaller image.';
    case 'REVIEW_WINDOW_EXPIRED':
      return 'The 14-day review window for this booking has closed.';
    case 'EDIT_WINDOW_EXPIRED':
      return 'The 48-hour edit window has expired. This review can no longer be edited.';
    default:
      return message || error?.message || 'An unexpected error occurred. Please try again.';
  }
}
