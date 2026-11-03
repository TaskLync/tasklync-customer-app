import { useState, useCallback, useMemo } from 'react';
import { ReviewCategoryKey, ReviewTag, ReviewItem } from '../types/review.types';

const INITIAL_CATEGORY_RATINGS: Record<ReviewCategoryKey, number> = {
  punctuality: 0,
  quality: 0,
  communication: 0,
  value: 0,
};

export const MAX_REVIEW_COMMENT_LENGTH = 2000;

export interface UseReviewFormStateReturn {
  overallRating: number;
  tags: ReviewTag[];
  categoryRatings: Record<ReviewCategoryKey, number>;
  comment: string;
  charCount: number;
  charLimit: number;
  isOverLimit: boolean;
  canSubmit: boolean;
  shouldShowCategorySection: boolean;
  setOverallRating: (rating: number) => void;
  setCategoryRating: (category: ReviewCategoryKey, rating: number) => void;
  toggleTag: (tag: ReviewTag) => void;
  setTags: (tags: ReviewTag[]) => void;
  setComment: (comment: string) => void;
  initializeFromReview: (review: Partial<ReviewItem>) => void;
  reset: () => void;
}

/**
 * useReviewFormState Hook
 *
 * Isolated, pure form-state machine for the review flow:
 * - Solves 2 independent required-ness rules: overall rating is hard-required (1-5), tags and comments are optional.
 * - Handles 2000 character maximum comment validation.
 * - Supports pre-filling for the 48-hour Edit Review window.
 * - Preserves user input across retry attempts without premature resets.
 */
export function useReviewFormState(): UseReviewFormStateReturn {
  const [overallRating, setOverallRatingInternal] = useState<number>(0);
  const [tags, setTagsInternal] = useState<ReviewTag[]>([]);
  const [categoryRatings, setCategoryRatings] = useState<Record<ReviewCategoryKey, number>>(
    INITIAL_CATEGORY_RATINGS
  );
  const [comment, setCommentInternal] = useState<string>('');

  const setOverallRating = useCallback((rating: number) => {
    setOverallRatingInternal(rating);
  }, []);

  const toggleTag = useCallback((tag: ReviewTag) => {
    setTagsInternal((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const setTags = useCallback((newTags: ReviewTag[]) => {
    setTagsInternal(newTags);
  }, []);

  const setCategoryRating = useCallback((category: ReviewCategoryKey, rating: number) => {
    setCategoryRatings((prev) => ({
      ...prev,
      [category]: rating,
    }));
  }, []);

  const setComment = useCallback((text: string) => {
    setCommentInternal(text);
  }, []);

  const initializeFromReview = useCallback((review: Partial<ReviewItem>) => {
    if (typeof review.rating === 'number') {
      setOverallRatingInternal(review.rating);
    }
    if (Array.isArray(review.tags)) {
      setTagsInternal(review.tags);
    }
    if (typeof review.comment === 'string') {
      setCommentInternal(review.comment);
    }
  }, []);

  const reset = useCallback(() => {
    setOverallRatingInternal(0);
    setTagsInternal([]);
    setCategoryRatings(INITIAL_CATEGORY_RATINGS);
    setCommentInternal('');
  }, []);

  const charCount = comment.length;
  const isOverLimit = charCount > MAX_REVIEW_COMMENT_LENGTH;
  const canSubmit = useMemo(() => {
    return overallRating >= 1 && overallRating <= 5 && !isOverLimit;
  }, [overallRating, isOverLimit]);

  const shouldShowCategorySection = useMemo(() => overallRating > 0, [overallRating]);

  return {
    overallRating,
    tags,
    categoryRatings,
    comment,
    charCount,
    charLimit: MAX_REVIEW_COMMENT_LENGTH,
    isOverLimit,
    canSubmit,
    shouldShowCategorySection,
    setOverallRating,
    setCategoryRating,
    toggleTag,
    setTags,
    setComment,
    initializeFromReview,
    reset,
  };
}
