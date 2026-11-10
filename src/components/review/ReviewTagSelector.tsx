import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ReviewTag, REVIEW_TAGS } from '../../types/review.types';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ReviewTagSelectorProps {
  selectedTags: ReviewTag[];
  onToggleTag: (tag: ReviewTag) => void;
  disabled?: boolean;
}

const ALL_TAGS: ReviewTag[] = [
  'punctual',
  'skilled',
  'clean',
  'professional',
  'good_value',
  'friendly',
];

export const ReviewTagSelector: React.FC<ReviewTagSelectorProps> = ({
  selectedTags,
  onToggleTag,
  disabled = false,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What stood out?</Text>
      <View style={styles.chipGrid}>
        {ALL_TAGS.map((tagKey) => {
          const meta = REVIEW_TAGS[tagKey];
          const isSelected = selectedTags.includes(tagKey);

          return (
            <Pressable
              key={tagKey}
              onPress={() => !disabled && onToggleTag(tagKey)}
              style={({ pressed }) => [
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
                disabled && styles.chipDisabled,
                pressed && !disabled && styles.chipPressed,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${meta.label}: ${meta.description}`}
              hitSlop={4}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipUnselected: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryDark,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: fontSize.dataSM,
  },
  chipTextUnselected: {
    fontFamily: fontFamily.jakarta.medium,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: fontFamily.jakarta.semiBold,
    color: colors.primaryDark,
  },
});