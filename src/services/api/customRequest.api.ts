/**
 * TaskLync Customer App — Custom Service Request & Quote API Client
 *
 * Strict integration with TaskLync API Gateway & Microservices:
 * - API Gateway Prefix: /api/v1
 * - booking-service:
 *     POST  /api/v1/custom-requests/media
 *     POST  /api/v1/custom-requests/:id/media
 *     POST  /api/v1/custom-requests
 *     GET   /api/v1/custom-requests
 *     GET   /api/v1/custom-requests/:id
 *     PATCH /api/v1/custom-requests/:id/cancel
 *     GET   /api/v1/custom-requests/:requestId/quotes
 *     POST  /api/v1/quotes/:id/accept
 *     PATCH /api/v1/quotes/:id/reject
 *     POST  /api/v1/bookings/from-quote
 */

import { Platform } from 'react-native';
import { apiClient } from './client';
import {
  CustomServiceRequest,
  CustomServiceRequestMedia,
  CustomServiceRequestMediaInput,
  CustomRequestStatus,
  Quote,
  CreateCustomRequestDto,
  CreateBookingFromQuoteDto,
  CustomRequestsListResponse,
  CustomRequestDetailResponse,
  QuotesForRequestResponse,
  BookingFromQuoteResponse,
} from '../../types/customRequest.types';

const ALLOWED_EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const CUSTOM_REQUEST_UPLOAD_TIMEOUT_MS = 60_000;

export const customRequestApi = {
  /**
   * Submit a new custom service request to a verified worker.
   * Path: POST /api/v1/custom-requests
   */
  async createRequest(payload: CreateCustomRequestDto): Promise<CustomServiceRequest> {
    try {
      const response = await apiClient.post<any>('/custom-requests', payload);
      const data = response.data?.data || response.data;
      return data;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[customRequestApi.createRequest] Failed:', error);
      }
      const apiMsg =
        error?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message;
      throw new Error(apiMsg || 'Failed to submit custom service request.');
    }
  },

  /**
   * Fetch authenticated customer's custom requests with pagination and optional status filter.
   * Path: GET /api/v1/custom-requests
   */
  async getMyRequests(params?: {
    status?: CustomRequestStatus | 'ALL';
    page?: number;
    limit?: number;
  }): Promise<CustomRequestsListResponse> {
    try {
      const cleanParams: Record<string, any> = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
      };
      if (params?.status && params.status !== 'ALL') {
        cleanParams.status = params.status;
      }

      const response = await apiClient.get<any>('/custom-requests', { params: cleanParams });
      const body = response.data;
      const data = body?.data ?? body;
      const rawRequests: CustomServiceRequest[] = Array.isArray(data)
        ? data
        : data?.requests || data?.items || [];

      const rawPagination = body?.pagination || body?.meta || data?.pagination || {
        total: rawRequests.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        totalPages: 1,
      };

      return {
        requests: rawRequests,
        pagination: {
          total: rawPagination.total ?? rawRequests.length,
          page: rawPagination.page ?? 1,
          limit: rawPagination.limit ?? 20,
          totalPages: rawPagination.totalPages ?? rawPagination.total_pages ?? 1,
          total_pages: rawPagination.total_pages ?? rawPagination.totalPages ?? 1,
          has_next: rawPagination.has_next ?? false,
          has_prev: rawPagination.has_prev ?? false,
        },
      };
    } catch (error: any) {
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to load custom requests.');
    }
  },

  /**
   * Fetch full custom request details including media attachments and active quote.
   * Path: GET /api/v1/custom-requests/:id
   */
  async getRequestById(id: string): Promise<CustomRequestDetailResponse> {
    try {
      const response = await apiClient.get<any>(`/custom-requests/${id}`);
      const body = response.data;
      const data = body?.data ?? body;

      const request: CustomServiceRequest = {
        ...data,
        media: data?.media || [],
      };

      return {
        request,
        media: data?.media || [],
        activeQuote: data?.active_quote ?? null,
      };
    } catch (error: any) {
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to load request details.');
    }
  },

  /**
   * Customer cancels an active custom service request.
   * Path: PATCH /api/v1/custom-requests/:id/cancel
   */
  async cancelRequest(id: string, reason?: string): Promise<CustomServiceRequest> {
    try {
      const payload = reason ? { reason: reason.trim() } : {};
      const response = await apiClient.patch<any>(`/custom-requests/${id}/cancel`, payload);
      return response.data?.data || response.data;
    } catch (error: any) {
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to cancel request.');
    }
  },

  /**
   * Fetch quotes and previous revisions submitted for this custom request.
   * Path: GET /api/v1/custom-requests/:requestId/quotes
   */
  async getQuotesForRequest(requestId: string): Promise<QuotesForRequestResponse> {
    try {
      const response = await apiClient.get<any>(`/custom-requests/${requestId}/quotes`);
      const body = response.data;
      const data = body?.data ?? body;

      const rawQuotes = Array.isArray(data)
        ? data
        : Array.isArray(data?.quotes)
        ? data.quotes
        : [];
      const rawRevisions = Array.isArray(data?.revisions) ? data.revisions : [];

      return {
        quotes: rawQuotes,
        revisions: rawRevisions,
      };
    } catch (error: any) {
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to fetch quotes for this request.');
    }
  },

  /**
   * Customer accepts a formal quote.
   * Path: POST /api/v1/quotes/:id/accept
   */
  async acceptQuote(quoteId: string): Promise<Quote> {
    try {
      const response = await apiClient.post<any>(`/quotes/${quoteId}/accept`, {});
      return response.data?.data || response.data;
    } catch (error: any) {
      // Handle HTTP 409 idempotency: If already accepted, return gracefully
      if (error?.response?.status === 409 && error?.response?.data?.error?.code === 'ALREADY_ACCEPTED') {
        const data = error.response.data?.data || error.response.data;
        return data as Quote;
      }
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to accept quote.');
    }
  },

  /**
   * Customer declines/rejects a formal quote with an optional reason.
   * Path: PATCH /api/v1/quotes/:id/reject
   */
  async rejectQuote(quoteId: string, reason?: string): Promise<Quote> {
    try {
      const payload = reason ? { reason: reason.trim() } : {};
      const response = await apiClient.patch<any>(`/quotes/${quoteId}/reject`, payload);
      return response.data?.data || response.data;
    } catch (error: any) {
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to decline quote.');
    }
  },

  /**
   * Finalize checkout from an accepted quote and create confirmed booking via COD.
   * Path: POST /api/v1/bookings/from-quote
   */
  async createBookingFromQuote(payload: CreateBookingFromQuoteDto): Promise<BookingFromQuoteResponse> {
    try {
      const response = await apiClient.post<any>('/bookings/from-quote', payload);
      return response.data?.data || response.data;
    } catch (error: any) {
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to confirm booking from quote.');
    }
  },

  /**
   * Upload an image or video attachment for a Custom Service Request.
   * Dedicated endpoint: POST /api/v1/custom-requests/media (or /api/v1/custom-requests/:requestId/media)
   * Completely isolated from the Reviews Media Upload API.
   */
  async uploadMedia(
    fileUri: string,
    mimeType: string = 'image/jpeg',
    onProgress?: (progressPercent: number) => void,
    requestId?: string
  ): Promise<CustomServiceRequestMediaInput & Partial<CustomServiceRequestMedia>> {
    if (!fileUri || typeof fileUri !== 'string' || fileUri.trim().length === 0) {
      throw new Error('Invalid media file selected.');
    }

    try {
      const formData = new FormData();
      const cleanUri = fileUri.split('?')[0];
      const rawFilename = cleanUri.split('/').pop() || `custom_req_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(rawFilename);
      const extension = match ? match[1].toLowerCase() : mimeType.startsWith('video') ? 'mp4' : 'jpg';
      const filename = match ? rawFilename : `${rawFilename}.${extension}`;

      let resolvedMime = (mimeType || '').toLowerCase();
      if (ALLOWED_EXTENSIONS[extension]) {
        resolvedMime = ALLOWED_EXTENSIONS[extension];
      } else if (resolvedMime === 'image/jpg') {
        resolvedMime = 'image/jpeg';
      }

      if (!ALLOWED_MIMES.has(resolvedMime)) {
        throw new Error('Unsupported file format. Allowed formats: JPEG, PNG, WEBP, MP4, MOV, WebM.');
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const fetchRes = await fetch(fileUri);
        const blob = await fetchRes.blob();
        formData.append('media', blob, filename);
      } else {
        formData.append('media', {
          uri: fileUri,
          name: filename,
          type: resolvedMime,
        } as any);
      }

      const endpoint = requestId
        ? `/custom-requests/${requestId}/media`
        : '/custom-requests/media';

      const response = await apiClient.post<any>(endpoint, formData, {
        timeout: CUSTOM_REQUEST_UPLOAD_TIMEOUT_MS,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(Math.min(100, Math.max(0, percent)));
          }
        },
      });

      const data = response.data?.data || response.data;
      const mediaUrl: string | undefined = data?.media_url || data?.url;

      if (!mediaUrl) {
        throw new Error('Upload succeeded but no media URL was returned by the server.');
      }

      const isVideo =
        data?.media_type === 'VIDEO' ||
        resolvedMime.startsWith('video/');

      // Use backend-returned cloudinary_public_id, or extract cleanly from secure_url
      let cloudinaryPublicId: string | undefined = data?.cloudinary_public_id;
      if (!cloudinaryPublicId) {
        const publicIdMatch = mediaUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
        cloudinaryPublicId = publicIdMatch
          ? publicIdMatch[1]
          : `tasklync/custom_requests/${filename.replace(/\.[^.]+$/, '')}`;
      }

      const resultItem: CustomServiceRequestMediaInput & Partial<CustomServiceRequestMedia> = {
        media_type: isVideo ? 'VIDEO' : 'IMAGE',
        media_url: mediaUrl,
        cloudinary_public_id: cloudinaryPublicId,
      };
      if (typeof data?.id === 'string') resultItem.id = data.id;
      if (typeof data?.request_id === 'string') resultItem.request_id = data.request_id;
      if (typeof data?.file_size_bytes === 'number') resultItem.file_size_bytes = data.file_size_bytes;
      if (typeof data?.created_at === 'string') resultItem.created_at = data.created_at;

      return resultItem;
    } catch (error: any) {
      const code = error?.code || error?.response?.data?.error?.code;
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;

      if (code === 'MEDIA_TOO_LARGE') {
        throw new Error(apiMsg || 'File is too large (max 8 MB for photos, 30 MB for videos).');
      }
      if (code === 'INVALID_MEDIA_TYPE') {
        throw new Error(apiMsg || 'Unsupported or corrupted file format.');
      }
      if (code === 'MEDIA_LIMIT_EXCEEDED' || code === 'MEDIA_UPLOAD_LIMIT_REACHED') {
        throw new Error(apiMsg || 'Maximum media attachment limit reached.');
      }
      if (error?.isTimeout || code === 'TIMEOUT') {
        throw new Error('Upload timed out. Please check your connection and retry.');
      }
      if (error?.isNetworkError || code === 'NETWORK_ERROR') {
        throw new Error('Network error while uploading media. Please check your internet connection.');
      }

      throw new Error(apiMsg || 'Failed to upload media attachment.');
    }
  },
};
