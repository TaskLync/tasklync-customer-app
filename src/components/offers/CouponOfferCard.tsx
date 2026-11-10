import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Check, Ticket, X } from 'lucide-react-native';
import { fontFamily } from '../../design';
import {
  discountValueLabel,
  formatEndsIn,
  formatRs,
} from '../../utils/offers';
import type { AvailableCoupon } from '../../types/offers.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CouponOfferCardProps {
  coupon: AvailableCoupon;
  /** This coupon is the one applied to the checkout. */
  applied: boolean;
  /** A validation request for this coupon is in flight. */
  busy: boolean;
  /** Some other request is in flight: taps are ignored so one code cannot be applied twice. */
  locked: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}

/** One usable coupon: code, value, conditions, and a single clear action (Apply / Applied ✓ + remove). */
export const CouponOfferCard: React.FC<CouponOfferCardProps> = ({
  coupon,
  applied,
  busy,
  locked,
  onApply,
  onRemove,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const details = [
    coupon.min_booking_amount > 0 ? `Min. order ${formatRs(coupon.min_booking_amount)}` : null,
    coupon.discount_type === 'PERCENT' && coupon.max_discount_amount
      ? `Up to ${formatRs(coupon.max_discount_amount)}`
      : null,
    coupon.first_booking_only ? 'First booking only' : null,
    formatEndsIn(coupon.ends_at),
  ].filter((d): d is string => Boolean(d));

  const blocked = !coupon.would_apply && !applied;
  const description = coupon.description || coupon.title;

  return (
    <View
      style={[styles.card, applied && styles.cardApplied, blocked && styles.cardBlocked]}
      accessible
      accessibilityLabel={`Coupon ${coupon.code}, ${discountValueLabel(coupon.discount_type, coupon.discount_value)}. ${
        applied ? 'Applied.' : blocked ? 'Not used: your worker offer saves more.' : `Saves ${formatRs(coupon.saving)}.`
      }`}
    >
      <View style={[styles.icon, applied && styles.iconApplied]}>
        <Ticket size={18} color={applied ? colors.pureWhite : palette.green700} strokeWidth={2.2} />
      </View>

      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text style={styles.code} numberOfLines={1}>{coupon.code}</Text>
          <View style={styles.valuePill}>
            <Text style={styles.valueText}>{discountValueLabel(coupon.discount_type, coupon.discount_value)}</Text>
          </View>
        </View>
        {description ? <Text style={styles.desc} numberOfLines={2}>{description}</Text> : null}
        {applied ? (
          <Text style={styles.saving}>You saved {formatRs(coupon.saving)}</Text>
        ) : blocked ? (
          <Text style={styles.note}>Your worker offer already saves more</Text>
        ) : details.length > 0 ? (
          <Text style={styles.meta} numberOfLines={2}>{details.join('  ·  ')}</Text>
        ) : null}
      </View>

      {applied ? (
        <View style={styles.actionCol}>
          <View style={styles.appliedPill}>
            <Check size={13} color={colors.pureWhite} strokeWidth={3} />
            <Text style={styles.appliedText}>Applied</Text>
          </View>
          <Pressable
            onPress={onRemove}
            disabled={locked}
            hitSlop={10}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Remove coupon ${coupon.code}`}
          >
            <X size={13} color={colors.textSecondary} strokeWidth={2.4} />
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => onApply(coupon.code)}
          disabled={locked || blocked}
          style={({ pressed }) => [
            styles.applyBtn,
            (locked || blocked) && !busy && styles.applyDisabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Apply coupon ${coupon.code}`}
          accessibilityState={{ disabled: locked || blocked, busy }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.pureWhite} />
          ) : (
            <Text style={styles.applyText}>Apply</Text>
          )}
        </Pressable>
      )}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardApplied: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryBorderSubtle,
  },
  cardBlocked: {
    opacity: 0.72,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  iconApplied: {
    backgroundColor: colors.primaryDark,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  code: {
    flexShrink: 1,
    fontFamily: fontFamily.inter.bold,
    fontSize: 15,
    letterSpacing: 0.6,
    color: colors.textPrimary,
  },
  valuePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primaryTint,
  },
  valueText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 11.5,
    color: palette.green700,
  },
  desc: {
    marginTop: 3,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  meta: {
    marginTop: 4,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
  },
  note: {
    marginTop: 4,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  saving: {
    marginTop: 4,
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 13,
    color: palette.green700,
  },
  actionCol: {
    alignItems: 'center',
    gap: 6,
  },
  applyBtn: {
    minWidth: 68,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  applyDisabled: {
    backgroundColor: colors.textMuted,
  },
  applyText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 13.5,
    color: colors.pureWhite,
  },
  appliedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
  },
  appliedText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 12,
    color: colors.pureWhite,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  removeText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
