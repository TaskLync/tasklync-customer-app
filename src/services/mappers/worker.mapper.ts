import { WorkerNearby, WorkerPublicProfile, WorkerServiceOffering, WorkerSkill } from '../../types/worker.types';
import { WorkerSearchDocument } from '../../types/search.types';
import { WorkerReview, ReviewSummaryData, WorkerPortfolioImage } from '../../types/review.types';
import { parsePriceNumber } from '../../utils/formatters';
import { resolveReviewerIdentity } from '../../utils/reviewerUtils';

/**
 * Data Mapper / DTO Transformer for Worker Service API Spec v2.0.0
 * Converts backend JSON responses to type-safe frontend domain objects.
 */

const formatCategoryStringList = (rawList: any): string[] => {
  if (!rawList) return [];
  if (typeof rawList === 'string') return [rawList.trim()];
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return item.categoryName || item.category_name || item.name || item.title || item.categoryId || '';
      }
      return '';
    })
    .filter(Boolean);
};

export const extractRawWorkerList = (resData: any): any[] => {
  if (__DEV__) {
    console.log('[DEBUG nearby-workers] API response payload before extraction:', JSON.stringify(resData).slice(0, 300));
  }

  if (!resData) return [];

  // Direct array response
  if (Array.isArray(resData)) return resData;

  // Standard Axios envelope resData.data
  const inner = resData.data !== undefined ? resData.data : resData;

  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.workers)) return inner.workers;
  if (Array.isArray(inner?.items)) return inner.items;
  if (Array.isArray(inner?.results)) return inner.results;
  if (Array.isArray(inner?.rows)) return inner.rows;
  if (Array.isArray(inner?.list)) return inner.list;
  if (Array.isArray(inner?.profiles)) return inner.profiles;
  if (Array.isArray(inner?.payload)) return inner.payload;
  if (Array.isArray(inner?.data)) return inner.data;

  // Fallback checks on top-level object
  if (Array.isArray(resData.workers)) return resData.workers;
  if (Array.isArray(resData.items)) return resData.items;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.rows)) return resData.rows;
  if (Array.isArray(resData.list)) return resData.list;
  if (Array.isArray(resData.profiles)) return resData.profiles;
  if (Array.isArray(resData.payload)) return resData.payload;

  console.warn('[extractRawWorkerList] Could not extract worker array from API response:', resData);
  return [];
};

export const extractPaginationMeta = (
  resData: any,
  fallbackCount: number,
  pageParam: number = 1,
  limitParam: number = 20
) => {
  const pagination =
    resData?.meta ||
    resData?.pagination ||
    resData?.data?.pagination ||
    resData?.meta?.pagination ||
    resData?.data?.meta?.pagination;

  const total =
    typeof pagination?.total === 'number'
      ? pagination.total
      : typeof resData?.total === 'number'
      ? resData.total
      : typeof resData?.data?.total === 'number'
      ? resData.data.total
      : fallbackCount;

  const page =
    typeof pagination?.page === 'number'
      ? pagination.page
      : typeof pagination?.currentPage === 'number'
      ? pagination.currentPage
      : pageParam;

  const limit =
    typeof pagination?.limit === 'number'
      ? pagination.limit
      : limitParam || 20;

  const totalPages =
    typeof pagination?.total_pages === 'number'
      ? pagination.total_pages
      : typeof pagination?.totalPages === 'number'
      ? pagination.totalPages
      : typeof pagination?.lastPage === 'number'
      ? pagination.lastPage
      : Math.max(1, Math.ceil(total / limit));

  const hasMore =
    typeof pagination?.has_next === 'boolean'
      ? pagination.has_next
      : typeof pagination?.hasNext === 'boolean'
      ? pagination.hasNext
      : page < totalPages;

  return {
    total,
    page,
    limit,
    totalPages,
    hasMore,
  };
};

export const mapRawSearchDocument = (raw: any): WorkerSearchDocument => {
  const workerId = String(
    raw?.worker_id || raw?.id || raw?._id || raw?.workerId || raw?.user_id || ''
  );
  const providerType: 'INDIVIDUAL' | 'COMPANY' =
    raw?.provider_type === 'COMPANY' || raw?.providerType === 'COMPANY' || raw?.is_company
      ? 'COMPANY'
      : 'INDIVIDUAL';

  const doc: WorkerSearchDocument = {
    worker_id: workerId,
    name: String(raw?.name || raw?.full_name || raw?.fullName || 'Worker'),
    bio: typeof raw?.bio === 'string' ? raw.bio : null,
    avatar_url:
      raw?.avatar_url || raw?.avatarUrl || raw?.avatar || raw?.photo_url || null,
    city: typeof raw?.city === 'string' ? raw.city : null,
    category_ids: Array.isArray(raw?.category_ids)
      ? raw.category_ids.map(String)
      : Array.isArray(raw?.categoryIds)
      ? raw.categoryIds.map(String)
      : [],
    category_names: formatCategoryStringList(
      raw?.category_names || raw?.categoryNames || raw?.categories || raw?.skills
    ),
    min_price:
      typeof raw?.min_price === 'number'
        ? raw.min_price
        : typeof raw?.minPrice === 'number'
        ? raw.minPrice
        : typeof raw?.starting_price === 'number'
        ? raw.starting_price
        : typeof raw?.startingPrice === 'number'
        ? raw.startingPrice
        : null,
    max_price:
      typeof raw?.max_price === 'number'
        ? raw.max_price
        : typeof raw?.maxPrice === 'number'
        ? raw.maxPrice
        : null,
    avg_rating:
      typeof raw?.avg_rating === 'number'
        ? raw.avg_rating
        : typeof raw?.avgRating === 'number'
        ? raw.avgRating
        : typeof raw?.rating === 'number'
        ? raw.rating
        : 0,
    total_reviews:
      typeof raw?.total_reviews === 'number'
        ? raw.total_reviews
        : typeof raw?.totalReviews === 'number'
        ? raw.totalReviews
        : typeof raw?.review_count === 'number'
        ? raw.review_count
        : 0,
    total_bookings:
      typeof raw?.total_bookings === 'number'
        ? raw.total_bookings
        : typeof raw?.totalBookings === 'number'
        ? raw.totalBookings
        : 0,
    is_verified: Boolean(raw?.is_verified ?? raw?.isVerified ?? true),
    is_available: Boolean(raw?.is_available ?? raw?.isAvailable ?? true),
    is_busy: Boolean(raw?.is_busy ?? raw?.isBusy ?? raw?.is_on_job ?? raw?.isOnJob ?? false),
    response_time_mins:
      typeof raw?.response_time_mins === 'number'
        ? raw.response_time_mins
        : typeof raw?.responseTimeMins === 'number'
        ? raw.responseTimeMins
        : 30,
    badges: Array.isArray(raw?.badges) ? raw.badges.map(String) : [],
    is_featured: Boolean(raw?.is_featured ?? raw?.isFeatured ?? false),
    provider_type: providerType,
    business_name:
      typeof raw?.business_name === 'string'
        ? raw.business_name
        : typeof raw?.businessName === 'string'
        ? raw.businessName
        : null,
    company_verified: Boolean(
      raw?.company_verified ?? raw?.companyVerified ?? Boolean(raw?.company_verified_at)
    ),
    max_concurrent_jobs:
      typeof raw?.max_concurrent_jobs === 'number'
        ? raw.max_concurrent_jobs
        : typeof raw?.maxConcurrentJobs === 'number'
        ? raw.maxConcurrentJobs
        : providerType === 'COMPANY'
        ? 5
        : 1,
  };

  if (typeof raw?.distance_meters === 'number' && Number.isFinite(raw.distance_meters)) {
    doc.distance_meters = raw.distance_meters;
  } else if (typeof raw?.distanceMeters === 'number' && Number.isFinite(raw.distanceMeters)) {
    doc.distance_meters = raw.distanceMeters;
  }

  return doc;
};

export const mapRawWorkerNearby = (raw: any): WorkerNearby => {
  if (!raw) {
    return {
      id: '',
      name: '',
      avatarUrl: null,
      avgRating: 0,
      totalReviews: 0,
      currency: 'Rs',
      distanceMeters: 0,
      distanceLabel: '',
      categories: [],
      availabilityStatus: 'OFFLINE',
      availableUntil: null,
      isOnJob: false,
      responseTimeMins: 0,
      startingPrice: null,
    };
  }

  const rawId =
    raw.worker_id ||
    raw.id ||
    raw._id ||
    raw.workerId ||
    raw.user_id ||
    raw.userId ||
    raw.user?.id ||
    raw.user?.user_id;

  const id = rawId !== undefined && rawId !== null && rawId !== ''
    ? String(rawId)
    : '';

  const name =
    raw.name ||
    raw.full_name ||
    raw.fullName ||
    raw.worker_name ||
    raw.workerName ||
    raw.user?.name ||
    raw.user?.full_name ||
    raw.user?.fullName ||
    (raw.user?.first_name ? `${raw.user.first_name} ${raw.user.last_name || ''}`.trim() : null) ||
    '';

  const avatarUrl =
    raw.avatar_url ||
    raw.avatarUrl ||
    raw.avatar ||
    raw.photo_url ||
    raw.photoUrl ||
    raw.profile_picture ||
    raw.user?.avatar ||
    raw.user?.avatar_url ||
    raw.user?.avatarUrl ||
    null;

  const avgRating =
    typeof raw.avg_rating === 'number'
      ? raw.avg_rating
      : typeof raw.rating === 'number'
      ? raw.rating
      : typeof raw.avgRating === 'number'
      ? raw.avgRating
      : typeof raw.rating_average === 'number'
      ? raw.rating_average
      : typeof raw.average_rating === 'number'
      ? raw.average_rating
      : 0;

  const totalReviews =
    typeof raw.total_reviews === 'number'
      ? raw.total_reviews
      : typeof raw.review_count === 'number'
      ? raw.review_count
      : typeof raw.totalReviews === 'number'
      ? raw.totalReviews
      : typeof raw.reviews_count === 'number'
      ? raw.reviews_count
      : 0;

  const totalBookings =
    typeof raw.total_bookings === 'number'
      ? raw.total_bookings
      : typeof raw.totalBookings === 'number'
      ? raw.totalBookings
      : typeof raw.total_jobs_completed === 'number'
      ? raw.total_jobs_completed
      : 0;

  const currency = raw.currency || 'Rs';
  const rawDist =
    raw.distance_meters ??
    raw.distanceMeters ??
    raw.distance ??
    (raw.distance_in_km != null ? Number(raw.distance_in_km) * 1000 : null) ??
    (raw.distance_km != null ? Number(raw.distance_km) * 1000 : null) ??
    (raw.distanceKm != null ? Number(raw.distanceKm) * 1000 : null);

  const hasExplicitDistance =
    rawDist !== null && rawDist !== undefined && !isNaN(Number(rawDist));
  const numDist = hasExplicitDistance ? Number(rawDist) : 0;
  const distanceMeters = Math.max(0, Math.round(numDist));

  const city = typeof raw.city === 'string' && raw.city.trim() ? raw.city.trim() : null;

  let distanceLabel = raw.distanceLabel || raw.distance_label;
  if (!distanceLabel || distanceLabel === '0.0 km' || distanceLabel === '0 km') {
    distanceLabel =
      distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : distanceMeters > 0
        ? `${Math.round(distanceMeters)} m`
        : city || 'Nearby';
  }

  const isBusy = Boolean(raw.is_busy ?? raw.isBusy ?? raw.is_on_job ?? raw.isOnJob ?? false);
  const isAvailable = Boolean(raw.is_available ?? raw.isAvailable ?? true);
  const isVerified = Boolean(raw.is_verified ?? raw.isVerified ?? true);

  const rawStatus =
    raw.availability_status ||
    raw.availabilityStatus ||
    raw.status ||
    (isBusy ? 'BUSY' : isAvailable ? 'AVAILABLE' : 'OFFLINE');

  const rawCatList =
    raw.category_names ||
    raw.categoryNames ||
    raw.categories ||
    raw.skills ||
    raw.skills_list ||
    raw.services ||
    raw.category ||
    raw.category_name ||
    raw.categoryName ||
    raw.skill_name ||
    raw.skillName;

  const categories = formatCategoryStringList(rawCatList);
  const categoryIds = Array.isArray(raw.category_ids)
    ? raw.category_ids.map(String)
    : Array.isArray(raw.categoryIds)
    ? raw.categoryIds.map(String)
    : [];

  const minPrice =
    typeof raw.min_price === 'number'
      ? raw.min_price
      : typeof raw.minPrice === 'number'
      ? raw.minPrice
      : null;

  const maxPrice =
    typeof raw.max_price === 'number'
      ? raw.max_price
      : typeof raw.maxPrice === 'number'
      ? raw.maxPrice
      : null;

  const startingPrice =
    minPrice !== null
      ? minPrice
      : typeof raw.starting_price === 'number'
      ? raw.starting_price
      : typeof raw.startingPrice === 'number'
      ? raw.startingPrice
      : typeof raw.hourly_rate === 'number'
      ? raw.hourly_rate
      : typeof raw.rate === 'number'
      ? raw.rate
      : typeof raw.base_price === 'number'
      ? raw.base_price
      : null;

  const lat =
    typeof raw.lat === 'number'
      ? raw.lat
      : typeof raw.latitude === 'number'
      ? raw.latitude
      : typeof raw.location?.latitude === 'number'
      ? raw.location.latitude
      : typeof raw.location?.lat === 'number'
      ? raw.location.lat
      : null;

  const lng =
    typeof raw.lng === 'number'
      ? raw.lng
      : typeof raw.longitude === 'number'
      ? raw.longitude
      : typeof raw.location?.longitude === 'number'
      ? raw.location.longitude
      : typeof raw.location?.lng === 'number'
      ? raw.location.lng
      : null;

  const providerType = (raw.provider_type || raw.providerType || (raw.is_company ? 'COMPANY' : 'INDIVIDUAL')) as 'INDIVIDUAL' | 'COMPANY';
  const isCompany = providerType === 'COMPANY' || Boolean(raw.is_company || raw.isCompany);
  const businessName = raw.business_name || raw.businessName || (isCompany ? name : null);
  const coverImageUrl = raw.cover_image_url || raw.coverImageUrl || raw.cover_url || raw.coverUrl || null;
  const ntnNumber = raw.ntn_number || raw.ntnNumber || null;
  const maxConcurrentJobs =
    typeof raw.max_concurrent_jobs === 'number'
      ? raw.max_concurrent_jobs
      : typeof raw.maxConcurrentJobs === 'number'
      ? raw.maxConcurrentJobs
      : raw.fleet_size || raw.fleetSize || (isCompany ? 5 : 1);
  const companyVerified = Boolean(
    raw.company_verified ?? raw.companyVerified ?? Boolean(raw.company_verified_at)
  );
  const badges = Array.isArray(raw.badges) ? raw.badges.map(String) : [];
  const isFeatured = Boolean(raw.is_featured ?? raw.isFeatured ?? false);
  const bio = typeof raw.bio === 'string' ? raw.bio : null;

  return {
    id,
    name,
    avatarUrl,
    avgRating,
    totalReviews,
    currency,
    distanceMeters,
    distanceLabel,
    categories,
    availabilityStatus: rawStatus,
    // True only when the backend sent a real-time status. Search results carry `is_available`
    // (= account active, always true), which must not be presented as "online now".
    hasLiveAvailability: Boolean(raw.availability_status || raw.availabilityStatus),
    availableUntil: raw.available_until || raw.availableUntil || null,
    isOnJob: isBusy,
    // 0 = unknown; UI hides response time rather than showing an invented value.
    responseTimeMins: raw.response_time_mins || raw.responseTimeMins || 0,
    startingPrice,
    lat,
    lng,
    bio,
    city,
    categoryIds,
    minPrice,
    maxPrice,
    totalBookings,
    isVerified,
    isAvailable,
    isBusy,
    badges,
    isFeatured,
    companyVerified,
    maxConcurrentJobs,
    hasDistance: hasExplicitDistance,
    providerType,
    businessName,
    isCompany,
    coverImageUrl,
    ntnNumber,
    fleetSize: maxConcurrentJobs,
  };
};

export const mapRawWorkerProfile = (raw: any): WorkerPublicProfile => {
  const baseNearby = mapRawWorkerNearby(raw);

  const rawServicesList =
    raw.services ||
    raw.service_offerings ||
    raw.serviceOfferings ||
    raw.offerings ||
    raw.worker_services;

  const serviceOfferings = Array.isArray(rawServicesList)
    ? rawServicesList.map(mapRawWorkerServiceOffering)
    : [];

  const providerType = baseNearby.providerType || (raw.provider_type === 'COMPANY' || raw.is_company ? 'COMPANY' : 'INDIVIDUAL');
  const isCompany = providerType === 'COMPANY' || Boolean(raw.is_company || raw.isCompany);
  const businessName = raw.business_name || raw.businessName || baseNearby.businessName || (isCompany ? baseNearby.name : null);
  const coverImageUrl = baseNearby.coverImageUrl || raw.cover_image_url || raw.coverImageUrl || null;
  const ntnNumber = baseNearby.ntnNumber || raw.ntn_number || raw.ntnNumber || null;
  const maxConcurrentJobs = raw.max_concurrent_jobs || raw.maxConcurrentJobs || baseNearby.fleetSize || (isCompany ? 5 : 1);
  // Never fabricate verification: only reflect what the backend reports.
  const companyVerifiedAt = raw.company_verified_at || raw.companyVerifiedAt || null;
  const verificationStatus =
    raw.verification_status || raw.verificationStatus || (raw.is_verified ? 'VERIFIED' : 'UNVERIFIED');

  return {
    ...baseNearby,
    bio: raw.bio || raw.description || null,
    yearsExperience: raw.experience_years ?? raw.years_experience ?? raw.yearsExperience ?? 0,
    totalBookings: raw.total_jobs_completed ?? raw.total_bookings ?? raw.totalBookings ?? 0,
    city: raw.city || null,
    verificationStatus,
    isVerified: Boolean(raw.is_verified ?? raw.isVerified ?? verificationStatus === 'VERIFIED'),
    skills: Array.isArray(raw.skills_list) ? raw.skills_list.map(mapRawWorkerSkill) : (raw.skills || []),
    serviceOfferings,

    provider_type: providerType,
    business_name: businessName,
    ntn_number: ntnNumber,
    max_concurrent_jobs: maxConcurrentJobs,
    company_verified_at: companyVerifiedAt,
    is_company: isCompany,
    coverImageUrl,
  };
};

export const mapRawWorkerServiceOffering = (raw: any): WorkerServiceOffering => {
  const id = raw.offeringId || raw.offering_id || raw.serviceId || raw.service_id || raw.id || `so-${Math.random()}`;
  const rawPrice = raw.price ?? raw.custom_price ?? raw.customPrice ?? raw.basePrice ?? raw.base_price ?? raw.hourly_rate;
  const customPrice = parsePriceNumber(rawPrice, 500);

  const serviceName =
    raw.name ||
    raw.title ||
    raw.serviceName ||
    raw.service_name ||
    raw.service?.name ||
    raw.service?.title ||
    'General Service';

  const description = raw.description || raw.desc || raw.short_description || null;
  const imageUrl = raw.image_url || raw.imageUrl || raw.image || raw.icon_url || raw.iconUrl || null;

  return {
    id,
    serviceId: raw.serviceId || raw.service_id || null,
    serviceName,
    serviceNameUr: raw.nameUr || raw.name_ur || raw.title_ur || raw.serviceNameUr || null,
    customPrice,
    priceType: (raw.priceType === 'PER_HOUR' || raw.price_unit === 'PER_HOUR' || raw.priceType === 'hourly' || raw.price_type === 'hourly' ? 'hourly' : raw.priceType === 'QUOTE' || raw.price_unit === 'QUOTE' || raw.priceType === 'quote' || raw.price_type === 'quote' ? 'quote' : 'fixed'),
    isCustom: raw.isCustom ?? raw.is_custom ?? false,
    notes: raw.notes || null,
    description,
    imageUrl,
    durationMins: parseDurationMins(raw),
  };
};

/** Reads an estimated duration (minutes) if the backend sent one; never invents a value. */
const parseDurationMins = (raw: any): number | null => {
  const mins = raw.duration_mins ?? raw.durationMins ?? raw.estimated_duration_mins ?? raw.service?.duration_mins;
  if (typeof mins === 'number' && mins > 0) return Math.round(mins);
  const hours =
    raw.estimated_duration_hours ?? raw.duration_hours ?? raw.service?.estimated_duration_hours;
  if (typeof hours === 'number' && hours > 0) return Math.round(hours * 60);
  return null;
};

export const mapRawWorkerSkill = (raw: any): WorkerSkill => {
  return {
    id: raw.skill_id || raw.id || '',
    categoryId: raw.category_id || raw.categoryId || raw.skill_id || '',
    categoryName: raw.name || raw.categoryName || 'Skill',
    isVerified: true,
    yearsExp: raw.experience_level === 'EXPERT' ? 5 : 2,
  };
};

export const mapRawWorkerPortfolio = (raw: any): WorkerPortfolioImage => {
  return {
    id: raw.id || '',
    workerId: raw.worker_id || raw.workerId || '',
    imageUrl: raw.image_url || raw.imageUrl || '',
    thumbnail: raw.thumbnail_url || raw.thumbnail || raw.image_url || '',
    caption: raw.title || raw.caption || null,
    width: raw.width || 800,
    height: raw.height || 600,
    order: raw.order || 0,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
  };
};

export const mapRawWorkerReview = (raw: any): WorkerReview => {
  const identity = resolveReviewerIdentity(raw);
  return {
    id: raw.id || '',
    bookingId: raw.booking_id || raw.bookingId || '',
    workerId: raw.worker_id || raw.workerId || '',
    reviewerId: raw.customer_id || raw.reviewerId || raw.user_id || '',
    reviewerName: identity.name,
    reviewerAvatar: identity.avatarUrl,
    rating: typeof raw.rating === 'number' ? raw.rating : 5,
    punctuality: raw.punctuality || 5,
    quality: raw.quality || 5,
    communication: raw.communication || 5,
    value: raw.value || 5,
    comment: raw.comment || null,
    reply: raw.reply || null,
    repliedAt: raw.replied_at || raw.repliedAt || null,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    isVerified: identity.isVerified,
    serviceName: raw.service_name || raw.serviceName,
  };
};

export const mapRawReviewSummary = (raw: any): ReviewSummaryData => {
  const total = typeof raw?.total_reviews === 'number' ? raw.total_reviews : (raw?.totalReviews || 0);
  const avg = typeof raw?.average_rating === 'number'
    ? raw.average_rating
    : typeof raw?.avgRating === 'number'
    ? raw.avgRating
    : total > 0
    ? 5.0
    : 0;

  return {
    avgRating: avg,
    totalReviews: total,
    ratingBreakdown: {
      5: raw?.["5_star_count"] ?? raw?.ratingBreakdown?.[5] ?? 0,
      4: raw?.["4_star_count"] ?? raw?.ratingBreakdown?.[4] ?? 0,
      3: raw?.["3_star_count"] ?? raw?.ratingBreakdown?.[3] ?? 0,
      2: raw?.["2_star_count"] ?? raw?.ratingBreakdown?.[2] ?? 0,
      1: raw?.["1_star_count"] ?? raw?.ratingBreakdown?.[1] ?? 0,
    },
    avgPunctuality: typeof raw?.punctuality === 'number' ? raw.punctuality : typeof raw?.avg_punctuality === 'number' ? raw.avg_punctuality : null,
    avgQuality: typeof raw?.quality === 'number' ? raw.quality : typeof raw?.avg_quality === 'number' ? raw.avg_quality : null,
    avgCommunication: typeof raw?.communication === 'number' ? raw.communication : typeof raw?.avg_communication === 'number' ? raw.avg_communication : null,
    avgValue: typeof raw?.value === 'number' ? raw.value : typeof raw?.avg_value === 'number' ? raw.avg_value : null,
  };
};
