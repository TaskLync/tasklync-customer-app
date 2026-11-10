import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BadgePercent } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { SkeletonGroup, SkeletonText } from '../ui/Skeleton/Skeleton';
import {
  formatEndsIn,
  formatMinOrder,
  formatOfferCap,
  formatOfferHeadline,
} from '../../utils/offers';
import type { PublicWorkerOffer } from '../../types/offers.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface WorkerOffersSectionProps {
  offers: PublicWorkerOffer[];
  isLoading?: boolean;
  /** Horizontal screen gutter. */
  gutter?: number;
  style?: StyleProp<ViewStyle>;
}

/** Tap-to-copy promo code. Only rendered when the backend sent a real code. */
const CodeChip: React.FC<{ code: string }> = ({ code }) => {
  const styles = useThemedStyles(createStyles);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Copy is a convenience; the code stays visible and can be typed.
    }
  }, [code]);

  return (
    <Pressable
      onPress={handleCopy}
      hitSlop={8}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Promo code ${code}. Tap to copy.`}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {copied ? 'Copied' : code}
      </Text>
    </Pressable>
  );
};

const OfferRow: React.FC<{ offer: PublicWorkerOffer; showDivider: boolean }> = React.memo(
  ({ offer, showDivider }) => {
    const { colors } = useAppTheme();
    const styles = useThemedStyles(createStyles);
    const headline = formatOfferHeadline(offer);
    const hasCode = Boolean(offer.code);

    // Small print: only facts the backend provided.
    const details = [
      formatMinOrder(offer),
      formatOfferCap(offer),
      hasCode ? null : 'Applied automatically',
      formatEndsIn(offer.ends_at),
    ].filter(Boolean) as string[];

    return (
      <View
        style={[styles.row, showDivider && styles.divider]}
        accessible
        accessibilityLabel={`${offer.title ? `${offer.title}. ` : ''}${headline}. ${details.join('. ')}`}
      >
        <BadgePercent size={20} color={colors.primary} strokeWidth={1.9} />
        <View style={styles.rowText}>
          <Text style={styles.headline} numberOfLines={1}>
            {headline}
            {offer.title ? <Text style={styles.title}>{`  ${offer.title}`}</Text> : null}
          </Text>
          {details.length > 0 ? (
            <Text style={styles.details} numberOfLines={2}>
              {details.join(' · ')}
            </Text>
          ) : null}
        </View>
        {offer.code ? <CodeChip code={offer.code} /> : null}
      </View>
    );
  }
);
OfferRow.displayName = 'OfferRow';

const OffersSkeleton: React.FC<{ gutter: number }> = ({ gutter }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <SkeletonGroup accessibilityLabel="Loading offers" style={{ paddingHorizontal: gutter }}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <SkeletonText fontSize={15} lineHeight={20} width="45%" />
          <SkeletonText fontSize={12} lineHeight={16} width="65%" style={styles.skeletonLine} />
        </View>
      </View>
    </SkeletonGroup>
  );
};

/**
 * A worker's live offers on their profile, as a flat list (no cards). Renders nothing when there
 * are none: an empty list is not an empty state, and a failed request just leaves the section out.
 * Promo code and minimum order appear per offer only when the backend returns them.
 */
export const WorkerOffersSection: React.FC<WorkerOffersSectionProps> = ({
  offers,
  isLoading = false,
  gutter = 20,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  if (!isLoading && offers.length === 0) return null;

  return (
    <View style={style}>
      <Text style={[styles.sectionTitle, { paddingHorizontal: gutter }]}>Offers</Text>
      {isLoading && offers.length === 0 ? (
        <OffersSkeleton gutter={gutter} />
      ) : (
        <View style={{ paddingHorizontal: gutter }}>
          {offers.map((offer, index) => (
            <OfferRow key={offer.id} offer={offer} showDivider={index > 0} />
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  sectionTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 52,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
  },
  headline: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  title: {
    fontFamily: fontFamily.jakarta.regular,
    color: colors.textSecondary,
  },
  details: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  chip: {
    minHeight: 30,
    maxWidth: 128,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 12.5,
    letterSpacing: 0.6,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.6,
  },
  skeletonLine: {
    marginTop: 6,
  },
});
