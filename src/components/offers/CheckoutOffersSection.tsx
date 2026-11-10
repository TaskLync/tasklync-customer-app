import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info, Sparkles } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { discountValueLabel, formatRs } from '../../utils/offers';
import type { CheckoutOffers } from '../../types/offers.types';
import type { usePromoCode } from '../../hooks/usePromoCode';
import { CouponOfferCard } from './CouponOfferCard';
import { PromoCodeInput } from './PromoCodeInput';
import { Skeleton, SkeletonGroup } from '../ui/Skeleton/Skeleton';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

type PromoController = ReturnType<typeof usePromoCode>;

interface CheckoutOffersSectionProps {
  offers: CheckoutOffers | undefined;
  isLoading: boolean;
  promo: PromoController;
  workerName?: string | undefined;
  onFocusField?: () => void;
}

/**
 * Checkout "Offers" block:
 *   - the worker's automatic offer, when one was applied by the server;
 *   - one card per coupon the server says this customer can use (Apply / Applied ✓ / Remove);
 *   - "Have a promo code?" for codes that are not listed (e.g. a code a worker shared).
 * Nothing here computes a price: every figure is the server's.
 */
export const CheckoutOffersSection: React.FC<CheckoutOffersSectionProps> = ({
  offers,
  isLoading,
  promo,
  workerName,
  onFocusField,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  if (isLoading && !offers) {
    return (
      <SkeletonGroup style={styles.section} accessibilityLabel="Loading offers">
        <Skeleton width={110} height={14} borderRadius={6} />
        <Skeleton height={76} borderRadius={14} style={styles.skeletonCard} />
      </SkeletonGroup>
    );
  }

  const coupons = offers?.coupons ?? [];
  const autoOffer = offers?.discount.applied;
  const appliedCode = promo.applied?.displayCode.toUpperCase() ?? null;
  const appliedInList = appliedCode !== null && coupons.some((c) => c.code.toUpperCase() === appliedCode);
  // The coupon the customer applied wins over the automatic offer only when the server says so.
  const showAutoOffer = !!autoOffer && autoOffer.source === 'WORKER_OFFER' && !autoOffer.code && !promo.applied;

  return (
    <View style={styles.section}>
      {coupons.length > 0 || showAutoOffer ? <Text style={styles.heading}>Offers for you</Text> : null}

      {showAutoOffer && autoOffer ? (
        <View style={styles.autoOffer} accessible accessibilityLabel={`${workerName ? workerName + "'s" : 'Worker'} offer applied automatically`}>
          <Sparkles size={16} color={palette.green700} strokeWidth={2.2} />
          <View style={styles.autoText}>
            <Text style={styles.autoTitle} numberOfLines={1}>
              {autoOffer.title || 'Worker offer'} · {discountValueLabel(autoOffer.discount_type, autoOffer.discount_value)}
            </Text>
            <Text style={styles.autoSub}>
              Applied automatically · you save {formatRs(autoOffer.amount)}
            </Text>
          </View>
        </View>
      ) : null}

      {coupons.map((coupon) => {
        const isApplied = appliedCode !== null && coupon.code.toUpperCase() === appliedCode;
        return (
          <CouponOfferCard
            key={coupon.code}
            coupon={coupon}
            applied={isApplied}
            busy={promo.isBusy && !isApplied && promo.input.toUpperCase() === coupon.code.toUpperCase()}
            locked={promo.isBusy || promo.isLocked}
            onApply={promo.applyCode}
            onRemove={promo.remove}
          />
        );
      })}

      {/* Why a qualifying coupon was not used (server policy: one discount per booking). */}
      {offers?.discount.not_applied && !promo.applied ? (
        <View style={styles.policy}>
          <Info size={14} color={colors.textMuted} style={styles.policyIcon} />
          <Text style={styles.policyText}>
            Only one discount applies per booking. Your {offers.discount.applied?.title ?? 'current offer'} saves more
            than {offers.discount.not_applied.title}.
          </Text>
        </View>
      ) : null}

      {/* Typed codes, the applied chip for a code that is not a card, and the message when a tap on a card is rejected. */}
      {!appliedInList ? (
        <PromoCodeInput promo={promo} workerName={workerName} onFocusField={onFocusField} />
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 6,
  },
  heading: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 4,
  },
  skeletonCard: {
    marginTop: 10,
  },
  autoOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorderSubtle,
  },
  autoText: {
    flex: 1,
    minWidth: 0,
  },
  autoTitle: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  autoSub: {
    marginTop: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: palette.green700,
  },
  policy: {
    flexDirection: 'row',
    gap: 8,
  },
  policyIcon: {
    marginTop: 2,
  },
  policyText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
