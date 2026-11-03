import { useQuery } from '@tanstack/react-query';
import { userApi } from '../services/api/user.api';
import { resolveReviewerIdentity, ReviewerIdentity } from '../utils/reviewerUtils';

/**
 * Scalable hook to resolve and hydrate real reviewer profile details:
 * - Checks in-memory review payload / current auth session instantly
 * - Asynchronously fetches real user profile by ID from the API
 * - Never adds third-party demo links; if the user has no photo, avatarUrl is null
 * - Globally caches profiles in React Query to prevent duplicate network calls
 */
export function useReviewerProfile(
  reviewerId: string | undefined | null,
  review: any
): ReviewerIdentity {
  const initialIdentity = resolveReviewerIdentity(review);

  const { data: remoteUser } = useQuery({
    queryKey: ['reviewer-profile', reviewerId],
    queryFn: () => userApi.getUserById(reviewerId as string),
    enabled: Boolean(reviewerId && reviewerId.length > 5),
    staleTime: 1000 * 60 * 30, // 30 minutes cache
    gcTime: 1000 * 60 * 60, // 1 hour persistence
  });

  if (remoteUser && remoteUser.name) {
    const remoteAvatar =
      typeof remoteUser.avatar_url === 'string' &&
      remoteUser.avatar_url.trim().length > 5 &&
      (remoteUser.avatar_url.startsWith('http://') ||
        remoteUser.avatar_url.startsWith('https://') ||
        remoteUser.avatar_url.startsWith('data:'))
        ? remoteUser.avatar_url.trim()
        : null;

    return {
      name: remoteUser.name.trim(),
      avatarUrl: remoteAvatar || initialIdentity.avatarUrl,
      isVerified: initialIdentity.isVerified,
    };
  }

  return initialIdentity;
}
