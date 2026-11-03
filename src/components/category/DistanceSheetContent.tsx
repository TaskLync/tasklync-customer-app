import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, Navigation, Check } from 'lucide-react-native';
import { SortOption } from '../../types/search.types';
import { Button } from '../ui/Button/Button';
import { colors, palette } from '../../design/colors';
import { typography } from '../../design/typography';

export interface DistanceSheetContentProps {
  currentRadius: number; // e.g. 5000, 10000, 25000, 50000
  currentSort: SortOption;
  onApply: (radius: number, sort: SortOption) => void;
  onReset: () => void;
}

interface DistanceOption {
  label: string;
  radiusMeters: number;
  subtitle: string;
}

const DISTANCE_OPTIONS: DistanceOption[] = [
  {
    label: 'Within 5 km',
    radiusMeters: 5000,
    subtitle: 'Closest workers • Fastest arrival',
  },
  {
    label: 'Within 10 km',
    radiusMeters: 10000,
    subtitle: 'Recommended • Best selection & ratings',
  },
  {
    label: 'Within 25 km',
    radiusMeters: 25000,
    subtitle: 'Extended metropolitan radius',
  },
  {
    label: 'All Distances',
    radiusMeters: 50000,
    subtitle: 'Show all available workers across the region',
  },
];

export const DistanceSheetContent: React.FC<DistanceSheetContentProps> = ({
  currentRadius = 10000,
  currentSort = 'distance',
  onApply,
  onReset,
}) => {
  const [selectedRadius, setSelectedRadius] = useState<number>(currentRadius);
  const [sortByNearest, setSortByNearest] = useState<boolean>(currentSort === 'distance');

  const handleApply = () => {
    onApply(selectedRadius, sortByNearest ? 'distance' : currentSort);
  };

  const handleResetToDefault = () => {
    setSelectedRadius(10000);
    setSortByNearest(true);
    onReset();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MapPin size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>Distance & Coverage</Text>
        </View>
        <Pressable onPress={handleResetToDefault} hitSlop={12}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionSubtitle}>
        Choose how far from your location you want to search for workers.
      </Text>

      {/* Distance Options */}
      <View style={styles.optionsList}>
        {DISTANCE_OPTIONS.map((opt) => {
          const isSelected = selectedRadius === opt.radiusMeters;

          return (
            <Pressable
              key={opt.radiusMeters}
              onPress={() => setSelectedRadius(opt.radiusMeters)}
              style={({ pressed }) => [
                styles.optionCard,
                isSelected && styles.optionCardSelected,
                pressed && styles.optionCardPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${opt.label}, ${opt.subtitle}`}
            >
              <View style={styles.optionTextWrap}>
                <View style={styles.optionLabelRow}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  {opt.radiusMeters === 10000 && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Standard</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
              </View>

              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Sort toggle option */}
      <Pressable
        onPress={() => setSortByNearest(!sortByNearest)}
        style={styles.sortToggleRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: sortByNearest }}
      >
        <Navigation size={18} color={sortByNearest ? colors.primary : colors.textMuted} />
        <Text style={styles.sortToggleText}>Prioritize closest workers first (Nearest sort)</Text>
        <View style={[styles.checkboxCircle, sortByNearest && styles.checkboxCircleSelected]}>
          {sortByNearest && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </View>
      </Pressable>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label="Apply Distance"
          onPress={handleApply}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.bgCard,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.poppins.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  resetText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 10,
    marginBottom: 16,
    lineHeight: 18,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.bgInput,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: palette.green50,
    borderColor: colors.primary,
  },
  optionCardPressed: {
    opacity: 0.85,
  },
  optionTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.primaryDark,
  },
  defaultBadge: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: colors.primaryDark,
  },
  optionSubtitle: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  radioCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.bgSection,
  },
  sortToggleText: {
    flex: 1,
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  checkboxCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: {
    marginTop: 20,
    paddingBottom: 4,
  },
});
