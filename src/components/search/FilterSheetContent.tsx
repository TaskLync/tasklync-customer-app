import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StarIcon } from '../ui/Icon/icons';
import {
  AvailabilityFilter,
  DEFAULT_FILTERS,
  FilterState,
  ProviderTypeFilter,
  SortOption,
} from '../../types/search.types';
import { Button } from '../ui/Button/Button';
import { RangeSlider } from '../ui/Slider/RangeSlider';
import { BottomSheetScrollView } from '../layout/BottomSheet';
import { useCategories } from '../../hooks/useCategories';
import { useCustomerCoords } from '../../hooks/useCustomerCoords';
import { typography } from '../../design/typography';
import { radius as radii } from '../../design/radius';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import {
  PRICE_MAX,
  PRICE_MIN,
  PRICE_STEP,
  SORT_LABELS,
  describePriceRange,
  filterToPriceRange,
  filtersEqual,
  formatRs,
  priceRangeToFilter,
} from '../../utils/searchFilters';

interface FilterSheetContentProps {
  /** The APPLIED filters. The sheet edits a draft copy and only reports it on Apply. */
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  /** What Reset restores (a category screen keeps its category). Defaults to DEFAULT_FILTERS. */
  defaultFilters?: FilterState;
  showCategories?: boolean;
  showMaxRate?: boolean;
  showDistance?: boolean;
  showProviderType?: boolean;
  showAvailability?: boolean;
}

const SORT_ORDER: SortOption[] = ['relevance', 'distance', 'rating', 'price_low', 'price_high'];

const PROVIDER_OPTIONS: { label: string; value: ProviderTypeFilter }[] = [
  { label: 'All providers', value: 'ALL' },
  { label: 'Solo craftsmen', value: 'INDIVIDUAL' },
  { label: 'Verified agencies', value: 'COMPANY' },
];

const AVAILABILITY_OPTIONS: { label: string; value: AvailabilityFilter }[] = [
  { label: 'Any time', value: 'any' },
  { label: 'Available now', value: 'now' },
];

const DISTANCE_OPTIONS = [
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: 'Any (50 km)', value: 50000 },
];

const cloneFilters = (f: FilterState): FilterState => ({
  ...DEFAULT_FILTERS,
  ...f,
  categories: [...(f.categories ?? [])],
  available: f.available === 'now' ? 'now' : 'any',
});

/* ───────────────────────── Controls ───────────────────────── */

const Pill: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
  flex?: boolean;
}> = ({ label, selected, onPress, disabled, icon, styles, flex }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.pill,
      flex && styles.pillFlex,
      selected && styles.pillSelected,
      pressed && !selected && styles.pillPressed,
      disabled && styles.disabled,
    ]}
    accessibilityRole="radio"
    accessibilityState={{ selected, disabled: Boolean(disabled) }}
    accessibilityLabel={label}
    hitSlop={{ top: 4, bottom: 4 }}
  >
    {icon}
    <Text style={[styles.pillText, selected && styles.pillTextSelected]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
      {label}
    </Text>
  </Pressable>
);

const Section: React.FC<{
  title: string;
  value?: string | null;
  note?: string | null;
  styles: ReturnType<typeof createStyles>;
  children: React.ReactNode;
}> = ({ title, value, note, styles, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {title}
      </Text>
      {!!value && (
        <Text style={styles.sectionValue} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {value}
        </Text>
      )}
    </View>
    {children}
    {!!note && (
      <Text style={styles.note} maxFontSizeMultiplier={1.3}>
        {note}
      </Text>
    )}
  </View>
);

/* ───────────────────────── Sheet ───────────────────────── */

export const FilterSheetContent: React.FC<FilterSheetContentProps> = ({
  filters,
  onApply,
  defaultFilters = DEFAULT_FILTERS,
  showCategories = true,
  showMaxRate = true,
  showDistance = true,
  showProviderType = true,
  showAvailability = true,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { categories: fetchedCategories } = useCategories();
  const hasLocation = useCustomerCoords() !== null;

  // Draft: seeded from the applied filters each time the sheet mounts (callers remount it per open),
  // so abandoned edits never leak into the next open and nothing is applied until "Apply".
  const [draft, setDraft] = useState<FilterState>(() => cloneFilters(filters));
  const update = useCallback((patch: Partial<FilterState>) => setDraft((d) => ({ ...d, ...patch })), []);

  const categoryOptions = useMemo(
    () =>
      Array.isArray(fetchedCategories)
        ? fetchedCategories.filter((c) => c?.id || c?.name).map((c) => ({ id: c.id || c.name, name: c.name }))
        : [],
    [fetchedCategories]
  );
  const selectedCategoryId = draft.categoryId ?? (draft.categories[0] || undefined);

  const isDefault = filtersEqual(draft, defaultFilters);
  const priceRange = filterToPriceRange(draft);

  const handleApply = () => {
    // "Nearest first" needs a position; the backend would reject it, so never apply it without one.
    const next = !hasLocation && draft.sortBy === 'distance' ? { ...draft, sortBy: 'relevance' as SortOption } : draft;
    onApply(cloneFilters(next));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
          Filters
        </Text>
        <Pressable
          onPress={() => setDraft(cloneFilters(defaultFilters))}
          disabled={isDefault}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Reset all filters"
          accessibilityState={{ disabled: isDefault }}
        >
          <Text style={[styles.resetText, isDefault && styles.resetDisabled]} maxFontSizeMultiplier={1.2}>
            Reset
          </Text>
        </Pressable>
      </View>

      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Sort */}
        <Section title="Sort by" styles={styles} note={!hasLocation ? 'Set your location to sort by distance.' : null}>
          <View accessibilityRole="radiogroup">
            {SORT_ORDER.map((value) => {
              const selected = draft.sortBy === value;
              const disabled = value === 'distance' && !hasLocation;
              return (
                <Pressable
                  key={value}
                  onPress={() => update({ sortBy: value })}
                  disabled={disabled}
                  style={({ pressed }) => [styles.radioRow, pressed && styles.radioRowPressed, disabled && styles.disabled]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled }}
                  accessibilityLabel={SORT_LABELS[value]}
                >
                  <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]} maxFontSizeMultiplier={1.3}>
                    {SORT_LABELS[value]}
                  </Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Provider type */}
        {showProviderType && (
          <Section title="Provider type" styles={styles}>
            <View style={styles.wrap}>
              {PROVIDER_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  label={o.label}
                  selected={(draft.provider_type ?? 'ALL') === o.value || (o.value === 'ALL' && draft.provider_type === 'ANY')}
                  onPress={() => update({ provider_type: o.value })}
                  styles={styles}
                />
              ))}
            </View>
          </Section>
        )}

        {/* Category — single choice (the API filters by one category); tap again to clear */}
        {showCategories && categoryOptions.length > 0 && (
          <Section title="Category" styles={styles}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              style={styles.hScrollOuter}
            >
              {categoryOptions.map((c) => {
                const selected = selectedCategoryId === c.id || draft.categories[0] === c.name;
                return (
                  <Pill
                    key={c.id}
                    label={c.name}
                    selected={selected}
                    onPress={() =>
                      update(
                        selected
                          ? { categoryId: undefined, categoryLabel: undefined, categories: [] }
                          : { categoryId: c.id, categoryLabel: c.name, categories: [c.name] }
                      )
                    }
                    styles={styles}
                  />
                );
              })}
            </ScrollView>
          </Section>
        )}

        {/* Minimum rating */}
        <Section title="Minimum rating" value={draft.minRating > 0 ? `${draft.minRating}+ stars` : 'Any'} styles={styles}>
          <View style={styles.row}>
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = draft.minRating === n;
              return (
                <Pill
                  key={n}
                  flex
                  label={String(n)}
                  selected={selected}
                  onPress={() => update({ minRating: selected ? 0 : n })}
                  icon={
                    <StarIcon
                      size={13}
                      strokeWidth={2.2}
                      color={selected ? palette.green700 : palette.gray400}
                      fill={selected ? palette.green700 : 'transparent'}
                    />
                  }
                  styles={styles}
                />
              );
            })}
          </View>
        </Section>

        {/* Availability */}
        {showAvailability && (
          <Section title="Availability" styles={styles}>
            <View style={styles.wrap}>
              {AVAILABILITY_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  label={o.label}
                  selected={draft.available === o.value}
                  onPress={() => update({ available: o.value })}
                  styles={styles}
                />
              ))}
            </View>
          </Section>
        )}

        {/* Distance */}
        {showDistance && (
          <Section
            title="Maximum distance"
            styles={styles}
            note={!hasLocation ? 'Set your location to filter by distance.' : null}
          >
            <View style={styles.row}>
              {DISTANCE_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  flex
                  label={o.label}
                  selected={(draft.radius ?? 10000) === o.value}
                  onPress={() => update({ radius: o.value })}
                  disabled={!hasLocation}
                  styles={styles}
                />
              ))}
            </View>
          </Section>
        )}

        {/* Price */}
        {showMaxRate && (
          <Section title="Price range" value={describePriceRange(draft) ?? 'Any price'} styles={styles}>
            <RangeSlider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              value={priceRange}
              trackColor={palette.green600}
              formatLabel={(v, thumb) => (thumb === 'max' && v >= PRICE_MAX ? `${formatRs(v)}+` : formatRs(v))}
              onChange={(val) => update(priceRangeToFilter(val))}
            />
          </Section>
        )}
      </BottomSheetScrollView>

      {/* Fixed action: content scrolls behind it */}
      <View style={styles.footer}>
        <Button label="Apply filters" onPress={handleApply} variant="primary" size="lg" fullWidth />
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bottomSheetBackground,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 12,
    },
    headerTitle: {
      fontFamily: typography.fontFamily.poppins.semiBold,
      fontSize: 20,
      lineHeight: 28,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    resetText: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 14.5,
      color: palette.green700,
    },
    resetDisabled: {
      color: colors.textDisabled,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 28,
      gap: 30,
    },

    section: {
      gap: 14,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 15.5,
      color: colors.textPrimary,
    },
    sectionValue: {
      flexShrink: 1,
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 13.5,
      color: colors.textSecondary,
    },
    note: {
      marginTop: -4,
      fontFamily: typography.fontFamily.jakarta.regular,
      fontSize: 12.5,
      color: colors.textMuted,
    },

    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 46,
      marginHorizontal: -8,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    radioRowPressed: {
      backgroundColor: colors.bgHover,
    },
    radioLabel: {
      fontFamily: typography.fontFamily.jakarta.regular,
      fontSize: 15,
      color: colors.textSecondary,
    },
    radioLabelSelected: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      color: colors.textPrimary,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: palette.green600,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: palette.green600,
    },

    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    hScrollOuter: {
      marginHorizontal: -24,
    },
    hScroll: {
      paddingHorizontal: 24,
      gap: 8,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      minHeight: 40,
      paddingHorizontal: 16,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: 'transparent',
      backgroundColor: colors.bgHover,
    },
    pillFlex: {
      flex: 1,
      paddingHorizontal: 6,
    },
    pillSelected: {
      backgroundColor: colors.primaryTint,
      borderColor: palette.green600,
    },
    pillPressed: {
      backgroundColor: colors.buttonSecondaryPressed,
    },
    pillText: {
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 14,
      color: colors.textSecondary,
    },
    pillTextSelected: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      color: palette.green700,
    },
    disabled: {
      opacity: 0.4,
    },

    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      backgroundColor: colors.bottomSheetBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
  });
