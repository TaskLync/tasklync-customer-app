import { useState, useCallback } from 'react';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { reviewApi, extractReviewErrorMessage } from '../services/api/review.api';
import {
  ReviewEligibility,
  CreateReviewPayload,
  EditReviewPayload,
  ReportReviewPayload,
  ReviewItem,
} from '../types/review.types';
import { useAuthStore } from '../store/auth.store';
import { showAlert } from '../components/feedback/AppAlert';

/**
 * 1. Check review eligibility & deadline for a booking
 */
export function useReviewEligibility(bookingId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['review-eligibility', bookingId],
    queryFn: async (): Promise<ReviewEligibility> => {
      return reviewApi.checkEligibility(bookingId);
    },
    enabled: Boolean(bookingId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    select: (data) => {
      const now = new Date().getTime();
      const deadlineTime = data.review_deadline ? new Date(data.review_deadline).getTime() : 0;
      const msLeft = Math.max(0, deadlineTime - now);
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));

      let formattedTimeLeft = '';
      if (daysLeft > 1) {
        formattedTimeLeft = `${daysLeft} days left`;
      } else if (hoursLeft > 0) {
        formattedTimeLeft = `${hoursLeft} hours left`;
      } else {
        formattedTimeLeft = 'Expired';
      }

      return {
        ...data,
        isEligible: data.status === 'ELIGIBLE' && !data.already_reviewed,
        isReviewed: data.already_reviewed || data.status === 'REVIEWED',
        isExpired: data.status === 'EXPIRED' || (deadlineTime > 0 && msLeft <= 0),
        daysRemaining: daysLeft,
        hoursRemaining: hoursLeft,
        formattedTimeLeft,
      };
    },
  });
}

/**
 * 2. Fetch worker review summary & rating distribution
 */
export function useWorkerReviewSummary(workerId: string) {
  return useQuery({
    queryKey: ['worker-review-summary', workerId],
    queryFn: () => reviewApi.getWorkerSummary(workerId),
    enabled: Boolean(workerId),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 3. Fetch paginated worker reviews with cursor pagination and star rating filter
 */
export function useWorkerReviewsFeed(workerId: string, ratingFilter?: number) {
  return useInfiniteQuery({
    queryKey: ['worker-reviews', workerId, ratingFilter],
    queryFn: async ({ pageParam }) => {
      return reviewApi.getWorkerReviews(workerId, {
        cursor: (pageParam as string | undefined) || undefined,
        rating: ratingFilter,
        limit: 20,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: Boolean(workerId),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 4. Submit new review
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => reviewApi.submitReview(payload),
    onSuccess: (data: ReviewItem) => {
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-review-summary', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-reviews', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['booking', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews/pending'] });
    },
  });
}

/**
 * 5. Edit existing review (allowed within 48h)
 */
export function useEditReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: EditReviewPayload;
    }) => reviewApi.editReview(reviewId, payload),
    onSuccess: (data: ReviewItem) => {
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-review-summary', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-reviews', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
    },
  });
}

/**
 * 6. Customer's own reviews history
 */
export function useCustomerReviews() {
  const userId = useAuthStore((s) => s.user?.id);

  return useInfiniteQuery({
    queryKey: ['user-reviews', userId],
    queryFn: async ({ pageParam }) => {
      if (!userId) return { reviews: [], hasMore: false };
      return reviewApi.getUserReviews(userId, {
        cursor: (pageParam as string | undefined) || undefined,
        limit: 20,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * 7. Report an inappropriate or abusive review
 */
export function useReportReview() {
  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: ReportReviewPayload;
    }) => reviewApi.reportReview(reviewId, payload),
  });
}

/**
 * 8. Media Upload Hook with image compression and max 5 photos guard
 */
export function useReviewMediaUpload(bookingId?: string) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pickAndUploadImage = useCallback(
    async (source: 'camera' | 'gallery') => {
      if (photos.length >= 5) {
        showAlert('Photo Limit Reached', 'You can upload a maximum of 5 photos per review.');
        return;
      }

      try {
        setUploadError(null);

        let result: ImagePicker.ImagePickerResult;

        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            showAlert('Permission Denied', 'Camera permission is required to take review photos.');
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          });
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            showAlert(
              'Permission Denied',
              'Photo library permission is required to attach review photos.'
            );
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: false,
          });
        }

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        const pickedAsset = result.assets[0];

        // Compress and resize image to keep strictly below 8MB limit (as per spec)
        setIsUploading(true);
        const manipResult = await ImageManipulator.manipulateAsync(
          pickedAsset.uri,
          [{ resize: { width: 1400 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Upload to Cloudinary via Review Service
        const uploadedUrl = await reviewApi.uploadPhoto(bookingId || '', manipResult.uri);

        setPhotos((prev) => [...prev, uploadedUrl]);
      } catch (err: any) {
        const message = extractReviewErrorMessage(err);
        setUploadError(message);
        showAlert('Upload Failed', message);
      } finally {
        setIsUploading(false);
      }
    },
    [bookingId, photos.length]
  );

  const removePhoto = useCallback((indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }, []);

  const resetPhotos = useCallback((initialPhotos: string[] = []) => {
    setPhotos(initialPhotos);
    setUploadError(null);
  }, []);

  return {
    photos,
    isUploading,
    uploadError,
    pickAndUploadImage,
    removePhoto,
    resetPhotos,
  };
}
