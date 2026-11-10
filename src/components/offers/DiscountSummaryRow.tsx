import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Tag } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { formatRs, getBookingSavings } from '../../utils/offers';
import type { BookingDiscountFields } from '../../types/offers.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface DiscountSummaryRowProps {
  booking: BookingDiscountFields | null | undefined;
  /**
   * 'row': "You saved Rs. X" + where the saving came from (booking details).
   * 'tag': compact "Saved Rs. X" for list items.
   * 'source': just where the saving came from ("Promo code · SU****R"), for use beside a price breakdown.
   */
  variant?: 'row' | 'tag' | 'source';
  style?: StyleProp<ViewStyle>;
}

/** Savings on a booking, read from the booking's own discount snapshot. Renders nothing without a discount. */
export const DiscountSummaryRow: React.FC<DiscountSummaryRowProps> = ({
  booking,
  variant = 'row',
  style,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const savings = getBookingSavings(booking);
  if (!savings.hasDiscount) return null;

  if (variant === 'tag') {
    return (
      <View
        style={[styles.tag, style]}
        accessible
        accessibilityLabel={`Saved ${formatRs(savings.amount)}`}
      >
        <Text style={styles.tagText}>Saved {formatRs(savings.amount)}</Text>
      </View>
    );
  }

  // "Promo code · SU****R", "Worker offer · Offer applied", or just "Offer applied" when funding is unknown.
  const caption = savings.sourceLabel === 'Discount'
    ? savings.chipLabel
    : `${savings.sourceLabel} · ${savings.chipLabel}`;

  if (variant === 'source') {
    return (
      <View style={[styles.source, style]} accessible accessibilityLabel={caption}>
        <Tag size={13} color={palette.green700} strokeWidth={2.4} />
        <Text style={styles.sourceText} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`You saved ${formatRs(savings.amount)}. ${caption}`}
    >
      <View style={styles.iconWrap}>
        <Tag size={14} color={palette.green700} strokeWidth={2.4} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.saved}>You saved {formatRs(savings.amount)}</Text>
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  saved: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 14,
    color: palette.green800,
  },
  caption: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: palette.green700,
    marginTop: 1,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 9,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    marginBottom: 8,
  },
  sourceText: {
    flexShrink: 1,
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: palette.green700,
  },
  tag: {
    alignSelf: 'flex-end',
    marginTop: 3,
    paddingHorizontal: 7,
    height: 19,
    borderRadius: 6,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
  },
  tagText: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 11,
    color: palette.green700,
  },
});
