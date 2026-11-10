import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { formatOfferValue } from '../../utils/offers';
import type { PublicWorkerOffer } from '../../types/offers.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CheckoutOffersNoticeProps {
  offers: PublicWorkerOffer[];
  /** A typed code is applied: it replaces the worker's automatic offer (spec 5.6, 9.4). */
  codeApplied: boolean;
}

/**
 * Honest copy for automatic offers at checkout. They cannot be previewed (B2/B6): the backend
 * applies one when the booking is created, so the final price is shown after booking.
 */
export const CheckoutOffersNotice: React.FC<CheckoutOffersNoticeProps> = ({ offers, codeApplied }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (offers.length === 0) return null;

  const first = offers[0];
  const lead = first ? formatOfferValue(first) : null;
  const text = codeApplied
    ? "A promo code replaces this worker's automatic offer."
    : `${offers.length > 1 ? 'Offers apply' : 'Offer applies'} automatically if eligible${
        lead ? ` (${lead}${offers.length > 1 ? ' and more' : ''})` : ''
      }. Final price is shown after booking.`;

  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      <Info size={14} color={colors.textMuted} style={styles.icon} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
