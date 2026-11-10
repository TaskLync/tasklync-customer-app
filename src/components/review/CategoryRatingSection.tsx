import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { ReviewCategoryKey } from '../../types/review.types';
import { CategoryRatingRow } from './CategoryRatingRow';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface CategoryRatingSectionProps {
  visible: boolean;
  categoryRatings: Record<ReviewCategoryKey, number>;
  onCategoryRatingChange: (category: ReviewCategoryKey, rating: number) => void;
  disabled?: boolean;
}

const CATEGORIES: Array<{ key: ReviewCategoryKey; label: string }> = [
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'quality', label: 'Service Quality' },
  { key: 'communication', label: 'Communication' },
  { key: 'value', label: 'Value for Money' },
];

/**
 * CategoryRatingSection Component
 *
 * Implements Progressive Disclosure & Goal-Gradient Psychology:
 * - Smooth 250ms spring entrance to prevent layout jank
 * - Motivational "Almost done" copy tied directly to the reveal trigger
 * - 4 compact category rating rows with inline labels
 */
export const CategoryRatingSection: React.FC<CategoryRatingSectionProps> = ({
  visible,
  categoryRatings,
  onCategoryRatingChange,
  disabled = false,
}) => {
  const styles = useThemedStyles(createStyles);
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(250).springify().damping(18).stiffness(180)}
      exiting={FadeOutUp.duration(150)}
      style={styles.container}
    >
      {/* Goal-Gradient Copy Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Almost done — rate the details</Text>
        <Text style={styles.subtitle}>
          Optional specifics help service professionals improve
        </Text>
      </View>

      {/* Category Rows */}
      <View style={styles.rowsContainer}>
        {CATEGORIES.map((cat, idx) => (
          <React.Fragment key={cat.key}>
            <CategoryRatingRow
              label={cat.label}
              value={categoryRatings[cat.key] || 0}
              onChange={(rating) => onCategoryRatingChange(cat.key, rating)}
              disabled={disabled}
            />
            {idx < CATEGORIES.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgSection,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.label,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  rowsContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs / 2,
  },
});
