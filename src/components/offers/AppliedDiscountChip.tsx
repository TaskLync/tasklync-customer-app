import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { fontFamily } from '../../design';
import { formatRs, formatValidUntil } from '../../utils/offers';
import type { AppliedPromo } from '../../types/offers.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface AppliedDiscountChipProps {
  applied: AppliedPromo;
  /** Name for worker-funded offers: "Offer from {worker}". */
  workerName?: string | undefined;
  onRemove: () => void;
  disabled?: boolean;
}

/** The code or offer currently applied to the checkout: what it is, what it saves, until when, and a way to remove it. */
export const AppliedDiscountChip: React.FC<AppliedDiscountChipProps> = ({
  applied,
  workerName,
  onRemove,
  disabled = false,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const source =
    applied.funding === 'WORKER'
      ? workerName
        ? `Offer from ${workerName}`
        : 'Worker offer'
      : 'Promo code';
  const heading = applied.displayCode || applied.title;
  const subtitle = applied.title && applied.title !== heading ? applied.title : null;
  const until = formatValidUntil(applied.endsAt);
  const saving = applied.pricing.discount_amount;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(120)}
      style={styles.card}
      accessible
      accessibilityLabel={`${source} ${heading} applied. You save ${formatRs(saving)}.`}
    >
      <View style={styles.check}>
        <Check size={14} color={colors.pureWhite} strokeWidth={3} />
      </View>

      <View style={styles.body}>
        <Text style={styles.source}>{source}</Text>
        <Text style={styles.code} numberOfLines={1}>
          {heading}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.saving}>You save {formatRs(saving)}</Text>
        {until ? <Text style={styles.sub}>{until}</Text> : null}
      </View>

      <Pressable
        onPress={onRemove}
        disabled={disabled}
        hitSlop={10}
        style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
        accessibilityRole="button"
        accessibilityLabel="Remove promo code"
      >
        {disabled ? (
          <ActivityIndicator size="small" color={colors.textMuted} />
        ) : (
          <X size={16} color={colors.textSecondary} strokeWidth={2.4} />
        )}
      </Pressable>
    </Animated.View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorderSubtle,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  source: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11.5,
    color: palette.green700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  code: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 16,
    letterSpacing: 0.4,
    color: colors.textPrimary,
    marginTop: 1,
  },
  sub: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 1,
  },
  saving: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 14,
    color: palette.green700,
    marginTop: 6,
  },
  remove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  removePressed: {
    backgroundColor: colors.bgHover,
  },
});
