import { apiClient } from './client';
import { NearbyWorkersParams, WorkerNearby, WorkerPublicProfile, WorkerReview, WorkerServiceOffering, WorkerSkill, ReviewSortOption, ReviewSummaryData, WorkerPortfolioImage } from '../../types';
import { ApiResponse } from '../../types/api.types';
import {
  mapRawWorkerNearby,
  mapRawWorkerProfile,
  mapRawWorkerServiceOffering,
  mapRawWorkerSkill,
  mapRawWorkerPortfolio,
  mapRawWorkerReview,
  mapRawReviewSummary,
  extractRawWorkerList,
  extractPaginationMeta,
} from '../mappers/worker.mapper';

/**
 * Worker Service API Specification v2.0.0 (Modules 5-10)
 * Proximity Search, Worker Identity, Offerings, Skills, Portfolio & Reviews
 */
export const workerApi = {
  /**
   * Module 5: GET /workers/nearby
   * Geofenced proximity search for workers
   */
  getNearbyWorkers: async (
    params: NearbyWorkersParams
  ): Promise<{ workers: WorkerNearby[]; total: number; page: number; hasMore: boolean }> => {
    const response = await apiClient.get<ApiResponse<any>>('/workers/nearby', {
      params: {
        lat: params.lat,
        lng: params.lng,
        radius: Math.min(params.radius || 20000, 20000),
        category: params.category,
        serviceId: params.serviceId,
        minRating: params.minRating,
        page: params.page || 1,
        limit: params.limit || 20,
      },
    });

    const rawWorkers = extractRawWorkerList(response.data);
    const meta = extractPaginationMeta(response.data, rawWorkers.length, params.page || 1, params.limit || 20);

    return {
      workers: rawWorkers.map(mapRawWorkerNearby),
      total: meta.total,
      page: meta.page,
      hasMore: meta.hasMore,
    };
  },


  /**
   * Module 6: GET /workers/:id
   * Fetch worker public profile details
   */
  getWorkerProfile: async (workerId: string): Promise<WorkerPublicProfile> => {
    const response = await apiClient.get<ApiResponse<any>>(`/workers/${workerId}`);
    return mapRawWorkerProfile(response.data?.data);
  },

  /**
   * Module 7: GET /workers/:id/services
   * Fetch custom service offerings and pricing for worker
   */
  getWorkerServices: async (workerId: string): Promise<WorkerServiceOffering[]> => {
    const response = await apiClient.get<ApiResponse<any>>(`/workers/${workerId}/services`);
    const data = response.data?.data;

    let rawOfferings: any[] = [];
    if (Array.isArray(data)) {
      rawOfferings = data;
    } else if (Array.isArray(data?.categories)) {
      rawOfferings = data.categories.flatMap((cat: any) =>
        Array.isArray(cat.services) ? cat.services : []
      );
    } else if (Array.isArray(data?.services)) {
      rawOfferings = data.services;
    } else if (Array.isArray(data?.items)) {
      rawOfferings = data.items;
    }

    return rawOfferings.map(mapRawWorkerServiceOffering);
  },

  /**
   * Module 8: GET /workers/:id/skills
   * Fetch worker public skills
   */
  getWorkerSkills: async (workerId: string): Promise<WorkerSkill[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/workers/${workerId}/skills`);
    const rawData = response.data?.data || [];
    return Array.isArray(rawData) ? rawData.map(mapRawWorkerSkill) : [];
  },

  /**
   * Module 9: GET /workers/:id/portfolio
   * Fetch worker portfolio photo gallery
   */
  getWorkerPortfolio: async (workerId: string): Promise<WorkerPortfolioImage[]> => {
    try {
      const response = await apiClient.get<ApiResponse<any[]>>(`/workers/${workerId}/portfolio`);
      const rawData = response.data?.data || [];
      return Array.isArray(rawData) ? rawData.map(mapRawWorkerPortfolio) : [];
    } catch (_err) {
      return [];
    }
  },

  /**
   * Module 10: GET /workers/:id/reviews
   * Fetch public customer reviews feed and rating summary
   */
  getWorkerReviews: async (
    workerId: string,
    params: { page?: number; limit?: number; sortBy?: ReviewSortOption } = {}
  ): Promise<{ reviews: WorkerReview[]; summary?: ReviewSummaryData; total: number; page: number; hasMore: boolean }> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/workers/${workerId}/reviews`, {
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          sortBy: params.sortBy || 'recent',
        },
      });

      const data = response.data?.data;
      const rawReviews = Array.isArray(data)
        ? data
        : Array.isArray(data?.reviews)
        ? data.reviews
        : [];

      const summary = mapRawReviewSummary(data?.rating_summary || data?.summary);
      const pagination = data?.pagination || response.data?.meta?.pagination;
      const total = pagination?.total || summary.totalReviews || rawReviews.length;
      const page = pagination?.page || params.page || 1;
      const totalPages = pagination?.totalPages || Math.ceil(total / (params.limit || 20));
      return {
        reviews: rawReviews.map(mapRawWorkerReview),
        summary,
        total,
        page,
        hasMore: page < totalPages,
      };
    } catch (_err) {
      return {
        reviews: [],
        total: 0,
        page: params.page || 1,
        hasMore: false,
      };
    }
  },

  /**
   * GET /workers/:id/slots?date=YYYY-MM-DD
   * Fetch real-time open time slots for worker on a date
   */
  getWorkerSlots: async (workerId: string, dateStr: string, durationHours: number = 2) => {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/workers/${workerId}/slots`, {
        params: { date: dateStr, duration_hours: durationHours },
      });
      const rawSlots: string[] = response.data?.data?.slots || [];
      return rawSlots.map((time24) => {
        const parts = time24.split(':');
        let h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        const period = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
        return {
          id: `slot-${dateStr}-${time24}`,
          timeStr,
          available: true,
        };
      });
    } catch (err) {
      return [];
    }
  },

  /**
   * GET /workers/:id/availability/month?year=YYYY&month=MM
   * Fetch available dates for a worker in a month
   */
  getWorkerMonthAvailability: async (
    workerId: string,
    year: number,
    month: number
  ): Promise<{ availableDates: string[]; unavailableDates: string[] }> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/workers/${workerId}/availability/month`, {
        params: { year, month },
      });
      return {
        availableDates: response.data?.data?.available_dates || [],
        unavailableDates: response.data?.data?.unavailable_dates || [],
      };
    } catch (err) {
      return { availableDates: [], unavailableDates: [] };
    }
  },
};
