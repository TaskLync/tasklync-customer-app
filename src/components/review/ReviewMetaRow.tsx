import React, { useState } from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { formatDistanceToNow, format, parseISO, differenceInDays } from 'date-fns';
import { fontFamily as fonts } from '../../design/typography';
import { ReviewStarRow } from './ReviewStarRow';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ReviewMetaRowProps {
  avatarUrl: string | null;
  reviewerName: string;
  date: string;
  isVerified?: boolean | undefined;
  rating?: number | undefined;
  editedAt?: string | null | undefined;
  rightAction?: React.ReactNode | undefined;
  size?: 'sm' | 'md' | undefined;
  style?: ViewStyle | undefined;
}

const getInitials = (name: string) => {
  const clean = (name || '').trim();
  if (!clean || clean.toLowerCase() === 'verified customer') {
    return 'C';
  }
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase() || 'C';
};

const formatDate = (dateString: string) => {
  try {
    const parsedDate = parseISO(dateString);
    const days = differenceInDays(new Date(), parsedDate);
    if (days < 30) {
      return formatDistanceToNow(parsedDate, { addSuffix: true });
    }
    return format(parsedDate, 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

/**
 * ReviewMetaRow Component
 *
 * Implements clean, scannable reviewer identity header:
 * [Avatar]  Reviewer Name  [✓ Verified]         [Action / Flag]
 *           ★★★★★ 5.0 · 2 days ago
 */
export const ReviewMetaRow: React.FC<ReviewMetaRowProps> = ({
  avatarUrl,
  reviewerName,
  date,
  isVerified: _isVerified = false,
  rating,
  editedAt,
  rightAction,
  size = 'md',
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  const [imageError, setImageError] = useState(false);
  const avatarSize = size === 'md' ? 36 : 30;
  const avatarShape = { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 };

  const hasValidImage = Boolean(avatarUrl) && !imageError;

  return (
    <View style={[styles.container, style]}>
      {hasValidImage ? (
        <Image
          source={{ uri: avatarUrl as string }}
          style={[styles.avatar, avatarShape]}
          contentFit="cover"
          transition={150}
          onError={() => setImageError(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.fallbackAvatar, avatarShape]}>
          <Text style={[styles.fallbackText, { fontSize: avatarSize * 0.38 }]}>
            {getInitials(reviewerName)}
          </Text>
        </View>
      )}

      <View style={styles.centerCol}>
        {/* Row 1: Reviewer Name + Inline Verified Indicator */}
        <View style={styles.nameRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {reviewerName}
          </Text>
        </View>

        {/* Row 2: Star rating (if provided) + Relative date */}
        <View style={styles.metaRow}>
          {typeof rating === 'number' && (
            <>
              <ReviewStarRow rating={rating} size="xs" />
              <Text style={styles.ratingNumberText}>{rating.toFixed(1)}</Text>
              <Text style={styles.dot}>·</Text>
            </>
          )}
          <Text style={styles.dateText} numberOfLines={1}>
            {formatDate(date)}
          </Text>
          {editedAt && <Text style={styles.editedTag}>(edited)</Text>}
        </View>
      </View>

      {rightAction ? <View style={styles.rightActionWrap}>{rightAction}</View> : null}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.bgSection,
  },
  fallbackAvatar: {
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontFamily: fonts.jakarta.semiBold,
    color: palette.gray600,
  },
  centerCol: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 13.5,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 100,
    backgroundColor: palette.green50,
    borderWidth: 1,
    borderColor: palette.green100,
    flexShrink: 0,
  },
  verifiedText: {
    fontFamily: fonts.jakarta.semiBold,
    fontSize: 10,
    color: colors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  ratingNumberText: {
    fontFamily: fonts.inter.semiBold,
    fontSize: 11,
    color: colors.textPrimary,
    marginLeft: 1,
  },
  dot: {
    fontSize: 11,
    color: palette.gray400,
  },
  dateText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 11.5,
    color: palette.gray500,
  },
  editedTag: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 10.5,
    color: palette.gray400,
    marginLeft: 2,
  },
  rightActionWrap: {
    marginLeft: 8,
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
});
