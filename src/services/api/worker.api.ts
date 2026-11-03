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
import { FAISALABAD_CENTER } from '../../config/serviceArea.config';
import { normalizeDateToYYYYMMDD } from '../../utils/timezone';

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
        provider_type: params.provider_type,
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
  getWorkerSlots: async (
    workerId: string,
    dateStr: string,
    durationHours: number = 0.5,
    signal?: AbortSignal
  ) => {
    try {
      const formattedDate = normalizeDateToYYYYMMDD(dateStr) || dateStr;
      const reqConfig: any = {
        params: { date: formattedDate, duration_hours: durationHours },
      };
      if (signal) reqConfig.signal = signal;

      const response = await apiClient.get<any>(`/workers/${workerId}/slots`, reqConfig);
      const resData = response.data?.data || response.data;

      // Handle structured slot_details with per-slot availability
      const slotDetails = resData?.slot_details;
      if (Array.isArray(slotDetails) && slotDetails.length > 0) {
        return slotDetails.map((item: any) => {
          const time24 = item.time;
          const parts = time24.split(':');
          let h = parseInt(parts[0], 10);
          const m = parseInt(parts[1] || '0', 10);
          const period = h >= 12 ? 'PM' : 'AM';
          h = h % 12;
          if (h === 0) h = 12;
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
          return {
            id: `slot-${formattedDate}-${time24}`,
            timeStr,
            available: Boolean(item.available),
          };
        });
      }

      // Backward compatible fallback for string array slots
      const rawSlots: string[] = resData?.slots || [];
      return rawSlots.map((time24) => {
        const parts = time24.split(':');
        let h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        const period = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
        return {
          id: `slot-${formattedDate}-${time24}`,
          timeStr,
          available: true,
        };
      });
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        // Request was aborted by newer request; let caller maintain state
        return null;
      }
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

  /**
   * Module 11: GET /workers/nearby & /search/workers?provider_type=COMPANY
   * Fetch registered service companies and agencies
   */
  getCompanies: async (params?: {
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
    category?: string;
  }): Promise<{ companies: WorkerNearby[]; total: number; page: number; hasMore: boolean }> => {
    try {
      const lat = params?.lat ?? FAISALABAD_CENTER.lat;
      const lng = params?.lng ?? FAISALABAD_CENTER.lng;
      const isCompanyRaw = (w: any) =>
        w?.provider_type === 'COMPANY' ||
        w?.providerType === 'COMPANY' ||
        w?.is_company === true ||
        w?.isCompany === true ||
        Boolean(w?.business_name || w?.businessName);

      const categoryParam = params?.category ? { category: params.category } : {};
      const limit = Math.min(params?.limit || 20, 20);

      // Ordered discovery strategies. First one that yields companies wins.
      // 1) Geo-scoped provider search (search-service with provider_type=COMPANY)
      // 2) Platform-wide provider search (no geo filter; covers agencies outside radius)
      // 3) Proximity feed with provider_type=COMPANY at user coords
      // 4) Proximity feed with provider_type=COMPANY at city center
      const strategies: Array<() => Promise<any[]>> = [
        async () => {
          const r = await apiClient.get<ApiResponse<any>>('/search/workers', {
            params: {
              provider_type: 'COMPANY',
              lat,
              lng,
              radius: 20000,
              limit,
              page: params?.page || 1,
              ...categoryParam,
            },
          });
          return extractRawWorkerList(r.data);
        },
        async () => {
          const r = await apiClient.get<ApiResponse<any>>('/search/workers', {
            params: { provider_type: 'COMPANY', limit, page: params?.page || 1, ...categoryParam },
          });
          return extractRawWorkerList(r.data);
        },
        async () => {
          const r = await apiClient.get<ApiResponse<any>>('/workers/nearby', {
            params: { lat, lng, radius: 20000, limit: 20, provider_type: 'COMPANY', ...categoryParam },
          });
          return extractRawWorkerList(r.data);
        },
        async () => {
          const r = await apiClient.get<ApiResponse<any>>('/workers/nearby', {
            params: {
              lat: FAISALABAD_CENTER.lat,
              lng: FAISALABAD_CENTER.lng,
              radius: 20000,
              limit: 20,
              provider_type: 'COMPANY',
              ...categoryParam,
            },
          });
          return extractRawWorkerList(r.data);
        },
      ];

      let rawCompanies: any[] = [];
      let anySucceeded = false;
      let lastError: unknown = null;

      for (let i = 0; i < strategies.length && rawCompanies.length === 0; i++) {
        try {
          const list = await strategies[i]!();
          anySucceeded = true;
          rawCompanies = list.filter(isCompanyRaw);
          if (__DEV__) {
            console.log(
              `[getCompanies] strategy ${i + 1}: ${list.length} results, ${rawCompanies.length} companies`
            );
          }
        } catch (err) {
          lastError = err;
          console.warn(`[getCompanies] strategy ${i + 1} failed:`, err);
        }
      }

      // Every network strategy failed: surface the error instead of pretending there are no companies.
      if (!anySucceeded && lastError) throw lastError;

      const mappedCompanies: WorkerNearby[] = rawCompanies.map((raw: any) => {
        const base = mapRawWorkerNearby(raw);
        return {
          ...base,
          providerType: 'COMPANY' as const,
          isCompany: true,
          businessName: raw.business_name || raw.businessName || base.businessName || base.name,
        };
      });

      return {
        companies: mappedCompanies,
        total: mappedCompanies.length,
        page: params?.page || 1,
        hasMore: false,
      };
    } catch (err) {
      console.warn('[workerApi.getCompanies] Error fetching companies:', err);
      throw err;
    }
  },
};
