import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RatingInput } from '../ui/Rating/RatingInput';
import { fontFamily, fontSize, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface CategoryRatingRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * CategoryRatingRow Component
 *
 * Single category row (~44px height):
 * - Label on the left in PlusJakartaSans-Medium
 * - Mini star rating input on the right (size="sm" / 20px)
 * - Recognition over Recall: Label always inline with its stars
 */
export const CategoryRatingRow: React.FC<CategoryRatingRowProps> = React.memo(
  function CategoryRatingRow({ label, value, onChange, disabled = false }) {
    const styles = useThemedStyles(createStyles);
    return (
      <View style={styles.row} accessibilityRole="none">
        <Text style={styles.label}>{label}</Text>
        <RatingInput
          value={value}
          onChange={onChange}
          size="sm"
          disabled={disabled}
          allowClear
        />
      </View>
    );
  }
);

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs / 2,
  },
  label: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.label,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
  },
});
