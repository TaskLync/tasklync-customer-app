import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ViewStyle,
  Pressable,
  LayoutAnimation,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';
import { Image } from 'expo-image';
import { Flag } from 'lucide-react-native';
import { WorkerReview, ReviewItem, REVIEW_TAGS } from '../../types/review.types';
import { ReviewMetaRow } from './ReviewMetaRow';
import { ReviewReplyBubble } from './ReviewReplyBubble';
import { ReviewImageModal } from './ReviewImageModal';
import { ReportReviewModal } from './ReportReviewModal';
import { Chip } from '../ui/Chip';
import { fontFamily as fonts } from '../../design/typography';
import { radius } from '../../design/radius';
import { useReviewerProfile } from '../../hooks/useReviewerProfile';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const REVIEW_CARD_GAP = 10;

interface ReviewCardProps {
  review: WorkerReview | ReviewItem;
  maxCommentLines?: number;
  showReply?: boolean;
  showWorkInfo?: boolean;
  allowReport?: boolean;
  style?: ViewStyle;
}

/**
 * ReviewCard Component (Uber / Careem Minimalist Standard)
 *
 * Implements clean, scannable review cards:
 * - Reviewer avatar, name, verified badge, stars, and relative date in a single compact header
 * - Feedback compliment tags (rendered only when available)
 * - Clean typography for comments with non-blocking expansion
 * - Photo attachments with modal viewer
 * - Provider reply bubble with thin green accent (hidden when no reply)
 * - Subtle, accessible flag action for reporting
 */
export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  maxCommentLines = 3,
  showReply = true,
  showWorkInfo = false,
  allowReport = true,
  style,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);

  const handleMeasure = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    setLineCount(e.nativeEvent.lines.length);
  }, []);

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    setIsExpanded((prev) => !prev);
  }, []);

  // Hydrate reviewer profile identity (name, real avatar photo)
  const reviewerId =
    'reviewerId' in review
      ? review.reviewerId
      : 'user_id' in review
      ? (review as any).user_id
      : (review as any).userId || (review as any).customer_id || null;

  const identity = useReviewerProfile(reviewerId, review);
  const reviewerName = identity.name;
  const reviewerAvatar = identity.avatarUrl;

  const date =
    'createdAt' in review
      ? review.createdAt
      : review.created_at || new Date().toISOString();

  const isVerified =
    'isVerified' in review ? Boolean(review.isVerified) : true;

  const rating = typeof review.rating === 'number' ? review.rating : 5;
  const comment = review.comment?.trim();
  const isTruncatable = lineCount > maxCommentLines;

  const tags =
    'tags' in review && Array.isArray(review.tags)
      ? review.tags
      : [];

  const photos =
    'photo_urls' in review && Array.isArray(review.photo_urls)
      ? review.photo_urls
      : 'photoUrls' in review && Array.isArray(review.photoUrls)
      ? review.photoUrls
      : [];

  const reply =
    'reply' in review
      ? review.reply
      : 'worker_reply' in review
      ? review.worker_reply
      : null;

  const repliedAt =
    'repliedAt' in review
      ? review.repliedAt
      : 'worker_replied_at' in review
      ? review.worker_replied_at
      : null;

  const editedAt =
    'editedAt' in review
      ? review.editedAt
      : 'edited_at' in review
      ? review.edited_at
      : null;

  const serviceName =
    ('serviceName' in review ? review.serviceName : undefined) ||
    ('service_name' in review ? review.service_name : undefined);

  return (
    <View style={[styles.card, style]}>
      {/* 1. Header Row: Reviewer Meta, Inline Verified Badge, Rating, Date & Report Action */}
      <ReviewMetaRow
        avatarUrl={reviewerAvatar}
        reviewerName={reviewerName}
        date={date}
        isVerified={isVerified}
        rating={rating}
        editedAt={editedAt}
        size="md"
        rightAction={
          allowReport ? (
            <Pressable
              onPress={() => setReportModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [styles.reportBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Report review"
            >
              <Flag size={13} color={palette.gray400} />
            </Pressable>
          ) : undefined
        }
      />

      {/* 2. Feedback Tags (Rendered only when tags exist) */}
      {tags && tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map((tag) => {
            const meta = REVIEW_TAGS[tag];
            const label = meta ? meta.label : tag;
            return (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 3. Written Review Text with Clamped Expansion (Rendered only when non-empty) */}
      {!!comment && (
        <View style={styles.commentContainer}>
          <Text
            style={[styles.commentText, styles.measure]}
            onTextLayout={handleMeasure}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {comment}
          </Text>

          <Text
            style={styles.commentText}
            numberOfLines={isExpanded || !isTruncatable ? undefined : maxCommentLines}
          >
            {comment}
          </Text>

          {isTruncatable && (
            <Pressable
              onPress={toggleExpand}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              style={styles.readMoreButton}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? 'Show less' : 'Read full review'}
            >
              <Text style={styles.readMoreText}>{isExpanded ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 4. Photo Gallery Thumbnails (Rendered only when photos exist) */}
      {photos && photos.length > 0 && (
        <View style={styles.photosGrid}>
          {photos.map((url, idx) => (
            <Pressable
              key={`${url}-${idx}`}
              onPress={() => setPreviewImage(url)}
              style={({ pressed }) => [styles.photoThumbnail, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`View photo ${idx + 1}`}
            >
              <Image source={{ uri: url }} style={styles.photoImg} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      )}

      {/* 5. Service Tag (Rendered only if showWorkInfo enabled) */}
      {showWorkInfo && !!serviceName && (
        <View style={styles.serviceChipContainer}>
          <Chip label={serviceName} size="sm" variant="tag" />
        </View>
      )}

      {/* 6. Provider Reply Bubble (Rendered only when reply exists) */}
      {showReply && !!reply && reply.trim().length > 0 && (
        <ReviewReplyBubble
          reply={reply}
          repliedAt={repliedAt || null}
          workerName="Service Provider"
        />
      )}

      {/* Full-screen Photo Modal */}
      <ReviewImageModal
        visible={Boolean(previewImage)}
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Report Review Modal */}
      <ReportReviewModal
        visible={reportModalVisible}
        reviewId={review.id}
        onClose={() => setReportModalVisible(false)}
      />
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reportBtn: {
    padding: 4,
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  tagChip: {},
  tagChipText: {
    fontFamily: fonts.jakarta.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentContainer: {
    marginTop: 8,
  },
  commentText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
  },
  readMoreButton: {
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 11.5,
    color: colors.primaryDark,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  photoThumbnail: {
    width: 52,
    height: 52,
    borderRadius: radius.sm, // 8
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  serviceChipContainer: {
    marginTop: 8,
  },
});
