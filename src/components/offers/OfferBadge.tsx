import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Tag } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { formatBadgePercent, formatEndsIn, isOfferLive } from '../../utils/offers';
import type { SearchWorkerPromotion } from '../../types/offers.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface OfferBadgeProps {
  /** `promotion` from a search result. Nothing renders when absent, expired, or without a usable percent. */
  promotion?: SearchWorkerPromotion | null | undefined;
  style?: StyleProp<ViewStyle>;
}

/**
 * Search-result offer indicator: "15% off · Spring clean-up · Ends in 2d".
 * The percent is the backend's effective percent and approximate; it is never turned into a price.
 */
export const OfferBadge: React.FC<OfferBadgeProps> = React.memo(({ promotion, style }) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (!promotion || !isOfferLive(promotion.ends_at)) return null;
  const percent = formatBadgePercent(promotion);
  if (!percent) return null;

  const title = promotion.title?.trim();
  const ends = formatEndsIn(promotion.ends_at);
  const detail = [title, ends].filter(Boolean).join(' · ');

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`Offer: ${percent}${detail ? `, ${detail}` : ''}`}
    >
      <View style={styles.pill}>
        <Tag size={10} color={palette.green700} strokeWidth={2.6} />
        <Text style={styles.pillText}>{percent}</Text>
      </View>
      {detail ? (
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
});
OfferBadge.displayName = 'OfferBadge';

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.primaryTint,
  },
  pillText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 11.5,
    color: palette.green700,
    letterSpacing: -0.1,
  },
  detail: {
    flexShrink: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
