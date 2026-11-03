import { useAuthStore } from '../store/auth.store';

/**
 * Normalizes any real image/avatar URL so that valid avatar images
 * (Cloudinary, HTTPS, relative paths) are formatted correctly for Image rendering.
 * Returns null if no valid real image exists.
 */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.length < 5) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.includes('cloudinary.com') || trimmed.startsWith('tasklync/')) {
    return `https://res.cloudinary.com/tasklync/image/upload/${trimmed.replace(/^\/+/, '')}`;
  }
  return trimmed;
}

/**
 * Blacklist of generic placeholder names that should not be shown as the customer's real name.
 */
const PLACEHOLDER_NAMES = new Set([
  'verified customer',
  'vc',
  'unknown',
  'anonymous',
]);

export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return PLACEHOLDER_NAMES.has(normalized) || normalized.length < 2;
}

export interface ReviewerIdentity {
  name: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

/**
 * Resolves a reviewer's real identity in a clean, scalable manner:
 * 1. Checks payload for real customer name & real avatar image (from server/database)
 * 2. Checks active authenticated user if reviewer ID matches current session
 * 3. Never loads third-party demo links; if no real photo exists, avatarUrl is null
 *    so the UI displays a clean, neutral gray avatar circle with initials.
 */
export function resolveReviewerIdentity(review: any): ReviewerIdentity {
  if (!review) {
    return { name: 'Customer', avatarUrl: null, isVerified: true };
  }

  const reviewerId =
    review.reviewerId ||
    review.reviewer_id ||
    review.userId ||
    review.user_id ||
    review.user?.id ||
    review.customer_id ||
    '';

  // 1. Check current logged-in user session
  const currentAuthUser = useAuthStore.getState().user;
  if (currentAuthUser && reviewerId && currentAuthUser.id === reviewerId) {
    const authUserName = currentAuthUser.name;
    const rawAvatar = currentAuthUser.avatar_url || currentAuthUser.avatarUrl || (currentAuthUser as any).avatar || null;
    const authAvatar = normalizeAvatarUrl(rawAvatar);

    return {
      name: !isPlaceholderName(authUserName) ? (authUserName as string) : 'Customer',
      avatarUrl: authAvatar,
      isVerified: true,
    };
  }

  // 2. Extract real name from candidate payload fields
  const candidateName =
    review.reviewerName ||
    review.reviewer_name ||
    review.customerName ||
    review.customer_name ||
    review.userName ||
    review.user_name ||
    review.authorName ||
    review.author_name ||
    review.user?.name ||
    review.user?.fullName ||
    review.user?.full_name ||
    review.customer?.name ||
    review.customer?.fullName ||
    review.reviewer?.name;

  const validName = !isPlaceholderName(candidateName) ? (candidateName as string).trim() : null;

  // 3. Extract real avatar URL from candidate payload fields (no demo links)
  const candidateAvatar =
    review.reviewerAvatar ||
    review.reviewer_avatar ||
    review.customerAvatar ||
    review.customer_avatar ||
    review.userAvatar ||
    review.user_avatar ||
    review.avatarUrl ||
    review.avatar_url ||
    review.avatar ||
    review.user?.avatar_url ||
    review.user?.avatarUrl ||
    review.user?.avatar ||
    review.customer?.avatar_url ||
    review.customer?.avatarUrl ||
    review.reviewer?.avatar;

  const validAvatar = normalizeAvatarUrl(candidateAvatar);

  return {
    name: validName || 'Customer',
    avatarUrl: validAvatar, // null if no real photo exists -> stays gray
    isVerified: true,
  };
}
