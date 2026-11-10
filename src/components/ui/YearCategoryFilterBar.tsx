import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { fontFamily, fontSize, radius, spacing, shadows } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface YearCategoryFilterBarProps {
  selectedYear: number | 'all';
  selectedCategory: string | 'all';
  availableYears?: number[];
  availableCategories?: { id: string; name: string }[];
  onYearChange: (year: number | 'all') => void;
  onCategoryChange: (category: string | 'all') => void;
}

export const YearCategoryFilterBar: React.FC<YearCategoryFilterBarProps> = ({
  selectedYear,
  selectedCategory,
  availableYears = [2026, 2025, 2024],
  availableCategories = [
    { id: 'all', name: 'All Categories' },
    { id: 'electrician', name: 'Electrician' },
    { id: 'plumber', name: 'Plumber' },
    { id: 'ac-repair', name: 'AC Repair' },
    { id: 'cleaning', name: 'Cleaning' },
    { id: 'painter', name: 'Painting' },
    { id: 'carpenter', name: 'Carpentry' },
    { id: 'appliance', name: 'Appliance Repair' },
  ],
  onYearChange,
  onCategoryChange,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [activeModal, setActiveModal] = useState<'year' | 'category' | null>(null);

  const yearLabel = selectedYear === 'all' ? 'All Years' : String(selectedYear);
  const activeCategoryObj = availableCategories.find((c) => c.id === selectedCategory);
  const categoryLabel = activeCategoryObj ? activeCategoryObj.name : 'All Categories';

  const handleOpenYear = () => {
    setActiveModal('year');
  };

  const handleOpenCategory = () => {
    setActiveModal('category');
  };

  const handleSelectYear = (year: number | 'all') => {
    onYearChange(year);
    setActiveModal(null);
  };

  const handleSelectCategory = (catId: string) => {
    onCategoryChange(catId);
    setActiveModal(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {/* Year Selector Pill */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleOpenYear}
          style={[styles.pill, selectedYear !== 'all' && styles.pillActive]}
          accessibilityRole="button"
          accessibilityLabel={`Filter by year: currently ${yearLabel}`}
        >
          <Text
            style={[styles.pillText, selectedYear !== 'all' && styles.pillTextActive]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {yearLabel}
          </Text>
          <ChevronDown
            size={14}
            color={selectedYear !== 'all' ? colors.primaryDark : colors.textMuted}
          />
        </TouchableOpacity>

        {/* Category Selector Pill */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleOpenCategory}
          style={[styles.pill, selectedCategory !== 'all' && styles.pillActive]}
          accessibilityRole="button"
          accessibilityLabel={`Filter by category: currently ${categoryLabel}`}
        >
          <Text
            style={[styles.pillText, selectedCategory !== 'all' && styles.pillTextActive]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {categoryLabel}
          </Text>
          <ChevronDown
            size={14}
            color={selectedCategory !== 'all' ? colors.primaryDark : colors.textMuted}
          />
        </TouchableOpacity>

        {/* Active Filter Clear CTA (if filtered) */}
        {(selectedYear !== 'all' || selectedCategory !== 'all') && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              onYearChange('all');
              onCategoryChange('all');
            }}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
          >
            <X size={13} color={colors.textSecondary} />
            <Text style={styles.clearBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Year Selection Modal Sheet */}
      <Modal
        visible={activeModal === 'year'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveModal(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                style={styles.closeModalBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.optionRow, selectedYear === 'all' && styles.optionRowSelected]}
              onPress={() => handleSelectYear('all')}
            >
              <Text style={[styles.optionText, selectedYear === 'all' && styles.optionTextSelected]}>
                All Years
              </Text>
              {selectedYear === 'all' && <Check size={18} color={colors.primaryDark} strokeWidth={2.5} />}
            </TouchableOpacity>

            {availableYears.map((year) => {
              const isSelected = selectedYear === year;
              return (
                <TouchableOpacity
                  key={year}
                  activeOpacity={0.7}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => handleSelectYear(year)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {year}
                  </Text>
                  {isSelected && <Check size={18} color={colors.primaryDark} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Category Selection Modal Sheet */}
      <Modal
        visible={activeModal === 'category'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveModal(null)}>
          <View style={[styles.modalCard, styles.categoryCard]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                style={styles.closeModalBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.categoryScroll}>
              {availableCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => handleSelectCategory(cat.id)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {cat.name}
                    </Text>
                    {isSelected && <Check size={18} color={colors.primaryDark} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    height: 44,
    backgroundColor: colors.bgApp,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.iceGray,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.softGray,
  },
  pillActive: {
    backgroundColor: palette.green50,
    borderColor: palette.green200,
  },
  pillText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  pillTextActive: {
    fontFamily: fontFamily.jakarta.bold,
    color: colors.primaryDark,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 3,
  },
  clearBtnText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.modalBackground,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadows.lg,
  },
  categoryCard: {
    maxHeight: 380,
  },
  categoryScroll: {
    maxHeight: 280,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  modalTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    color: colors.textPrimary,
  },
  closeModalBtn: {
    padding: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionRowSelected: {
    backgroundColor: palette.green50,
  },
  optionText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    fontFamily: fontFamily.jakarta.bold,
    color: colors.primaryDark,
  },
});
