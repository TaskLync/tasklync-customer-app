import { useCallback, useState } from 'react';
import { StyleSheet, View, Text, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, Edit3, Lock } from 'lucide-react-native';
import { Image } from 'expo-image';

import { useCustomerReviews } from '../../src/hooks/useReview';
import { ReviewItem, REVIEW_TAGS } from '../../src/types/review.types';
import { ReviewStarRow } from '../../src/components/review/ReviewStarRow';
import { ReviewReplyBubble } from '../../src/components/review/ReviewReplyBubble';
import { ReviewImageModal } from '../../src/components/review/ReviewImageModal';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { fontFamily as fonts } from '../../src/design/typography';
import { radius } from '../../src/design/radius';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

/**
 * CustomerReviewsScreen (My Reviews)
 *
 * Implements Section 4.7 of REVIEW_SERVICE_CUSTOMER_API_SPECIFICATION.md:
 * - Lists all customer reviews with cursor pagination
 * - Displays 48-hour edit window indicator with quick "Edit" action
 * - Displays professional rebuttal/reply
 */
export default function CustomerReviewsScreen() {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCustomerReviews();

  const [refreshing, setRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const reviews: ReviewItem[] = data?.pages.flatMap((page) => page.reviews) ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = useCallback(
    (review: ReviewItem) => {
      router.push({
        pathname: '/booking/[id]/review' as any,
        params: { id: review.booking_id, editReviewId: review.id },
      });
    },
    [router]
  );

  const renderItem = ({ item }: { item: ReviewItem }) => {
    // Calculate 48h edit window
    const createdAtTime = new Date(item.created_at).getTime();
    const now = new Date().getTime();
    const diffHours = (now - createdAtTime) / (1000 * 60 * 60);
    const canEdit = diffHours < 48;
    const hoursLeft = Math.max(1, Math.round(48 - diffHours));

    return (
      <View style={styles.reviewCard}>
        {/* Top Header: Rating + Edit / Lock status */}
        <View style={styles.cardHeader}>
          <View style={styles.ratingWrap}>
            <ReviewStarRow rating={item.rating} size="sm" />
            <Text style={styles.ratingNumber}>{item.rating}.0</Text>
            {item.edited_at ? <Text style={styles.editedNotice}>(edited)</Text> : null}
          </View>

          {canEdit ? (
            <Pressable
              style={({ pressed }) => [styles.editBadge, pressed && styles.pressed]}
              onPress={() => handleEdit(item)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Edit review. ${hoursLeft} hours remaining.`}
            >
              <Edit3 size={13} color={colors.primary} />
              <Text style={styles.editBadgeText}>{hoursLeft}h left to edit</Text>
            </Pressable>
          ) : (
            <View style={styles.lockedBadge}>
              <Lock size={12} color={palette.gray400} />
              <Text style={styles.lockedBadgeText}>Locked</Text>
            </View>
          )}
        </View>

        {/* Compliment Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => {
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

        {/* Written Comment */}
        {item.comment ? (
          <Text style={styles.commentText}>{item.comment}</Text>
        ) : null}

        {/* Photos Grid */}
        {item.photo_urls && item.photo_urls.length > 0 && (
          <View style={styles.photosGrid}>
            {item.photo_urls.map((url, idx) => (
              <Pressable
                key={`${url}-${idx}`}
                onPress={() => setPreviewImage(url)}
                style={styles.photoThumbTouch}
              >
                <Image source={{ uri: url }} style={styles.photoThumbImg} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Worker Response */}
        {item.worker_reply ? (
          <ReviewReplyBubble
            reply={item.worker_reply}
            repliedAt={item.worker_replied_at || null}
            workerName="Service Professional"
            style={styles.replyBubble}
          />
        ) : null}

        {/* Bottom Booking Reference */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            Reviewed on {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your reviews...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          type="no-data"
          title="No Reviews Submitted Yet"
          description="When you complete a booking and rate your service professional, your reviews will appear here."
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />

      {/* Screen Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={styles.iconButton} />
      </View>

      <FlashList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={hasNextPage ? fetchNextPage : null}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {/* Full Screen Image Modal */}
      <ReviewImageModal
        visible={Boolean(previewImage)}
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.poppins.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  listContent: {
    padding: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  reviewCard: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingNumber: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  editedNotice: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 11,
    color: palette.gray400,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.green50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  editBadgeText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  lockedBadgeText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 11,
    color: palette.gray500,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: palette.green50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagChipText: {
    fontFamily: fonts.jakarta.medium,
    fontSize: 11,
    color: colors.primaryDark,
  },
  commentText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    marginTop: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  photoThumbTouch: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  replyBubble: {
    marginTop: 12,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
  },
  dateText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 11,
    color: palette.gray400,
  },
  centerLoading: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.jakarta.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
});
