import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { reviewApi } from '../services/api/review.api';
import { workerApi } from '../services/api/worker.api';
import { userApi } from '../services/api/user.api';
import { ReviewItem, ReviewSortOption, WorkerReview, ReviewSummaryData } from '../types/review.types';
import { resolveReviewerIdentity } from '../utils/reviewerUtils';

export const useWorkerReviews = (
  workerId: string,
  sortBy: ReviewSortOption = 'recent',
  ratingFilter?: number | undefined
) => {
  // Query worker summary
  const summaryQuery = useQuery<ReviewSummaryData | undefined>({
    queryKey: ['worker-review-summary', workerId],
    queryFn: async (): Promise<ReviewSummaryData | undefined> => {
      try {
        const raw = await reviewApi.getWorkerSummary(workerId);
        if (raw) {
          return {
            avgRating: raw.average,
            totalReviews: raw.total,
            ratingBreakdown: {
              5: raw.distribution?.['5'] || 0,
              4: raw.distribution?.['4'] || 0,
              3: raw.distribution?.['3'] || 0,
              2: raw.distribution?.['2'] || 0,
              1: raw.distribution?.['1'] || 0,
            },
            topTags: raw.top_tags || [],
          };
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
    enabled: Boolean(workerId),
    staleTime: 60_000,
  });

  // Infinite query for reviews (connects to /reviews/worker/:workerId)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['worker-reviews', workerId, sortBy, ratingFilter],
    queryFn: async ({ pageParam }) => {
      // First try microservice endpoint /reviews/worker/:workerId
      try {
        const res = await reviewApi.getWorkerReviews(workerId, {
          cursor: (pageParam as string | undefined) || undefined,
          rating: ratingFilter,
          limit: 20,
        });

        if (res.reviews && res.reviews.length > 0) {
          // Batch fetch real user profiles for reviewers missing name/avatar
          const unhydratedUserIds = [
            ...new Set(
              res.reviews
                .filter((r) => (!r.reviewer_name || !r.reviewer_avatar) && r.user_id)
                .map((r) => r.user_id)
            ),
          ];

          const userProfilesMap = new Map<string, { name: string; avatar_url: string | null }>();

          if (unhydratedUserIds.length > 0) {
            await Promise.allSettled(
              unhydratedUserIds.map(async (uid) => {
                const profile = await userApi.getUserById(uid);
                if (profile && profile.name) {
                  userProfilesMap.set(uid, profile);
                }
              })
            );
          }

          // Normalize ReviewItem to WorkerReview format with resolved real customer identity
          const mappedReviews: WorkerReview[] = res.reviews.map((r) => {
            const remote = r.user_id ? userProfilesMap.get(r.user_id) : undefined;
            const enriched = {
              ...r,
              reviewer_name: remote?.name || r.reviewer_name,
              reviewer_avatar: remote?.avatar_url || r.reviewer_avatar,
            };
            const identity = resolveReviewerIdentity(enriched);
            return {
              id: r.id,
              bookingId: r.booking_id,
              workerId: r.worker_id,
              reviewerId: r.user_id,
              reviewerName: identity.name,
              reviewerAvatar: identity.avatarUrl,
              rating: r.rating,
              comment: r.comment || null,
              reply: r.worker_reply || null,
              repliedAt: r.worker_replied_at || null,
              createdAt: r.created_at,
              isVerified: identity.isVerified,
              serviceName: r.service_name,
              service_name: r.service_name,
              tags: r.tags,
              photoUrls: r.photo_urls,
              photo_urls: r.photo_urls,
              editedAt: r.edited_at || null,
              edited_at: r.edited_at || null,
            };
          });

          return {
            reviews: mappedReviews,
            rawReviews: res.reviews,
            nextCursor: res.nextCursor,
            hasMore: res.hasMore,
          };
        }
      } catch {
        // Fallback to legacy workerApi if review service is temporarily unreachable
      }

      // Fallback
      const legacy = await workerApi.getWorkerReviews(workerId, {
        page: typeof pageParam === 'number' ? pageParam : 1,
        limit: 20,
        sortBy,
      });

      return {
        reviews: legacy.reviews,
        rawReviews: [],
        nextCursor: legacy.hasMore ? (typeof pageParam === 'number' ? pageParam + 1 : 2) : undefined,
        hasMore: legacy.hasMore,
      };
    },
    initialPageParam: undefined as string | number | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: Boolean(workerId),
    staleTime: 60_000,
  });

  const reviews: WorkerReview[] = data?.pages.flatMap((page) => page.reviews) ?? [];
  const rawReviews: ReviewItem[] = data?.pages.flatMap((page) => page.rawReviews || []) ?? [];

  return {
    reviews,
    rawReviews,
    summary: summaryQuery.data,
    total: reviews.length,
    isLoading: isLoading || summaryQuery.isLoading,
    isLoadingMore: isFetchingNextPage,
    hasNextPage,
    loadMore: fetchNextPage,
    refetch: async () => {
      await Promise.all([refetch(), summaryQuery.refetch()]);
    },
  };
};
