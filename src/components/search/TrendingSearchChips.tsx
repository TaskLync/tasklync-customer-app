import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { TrendingUp, Flame } from 'lucide-react-native';
import { typography } from '../../design/typography';
import { TrendingTerm } from '../../types/search.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface TrendingSearchChipsProps {
  terms: TrendingTerm[];
  onSelect: (term: string) => void;
  title?: string;
}

export const TrendingSearchChips: React.FC<TrendingSearchChipsProps> = ({
  terms,
  onSelect,
  title = 'Trending Searches',
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (!terms || terms.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TrendingUp size={16} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.chipsWrap}>
        {terms.map((item, idx) => (
          <Pressable
            key={`${item.term}-${idx}`}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={() => onSelect(item.term)}
            accessibilityRole="button"
            accessibilityLabel={`Search for ${item.term}`}
          >
            <Flame size={13} color={palette.orange500} />
            <Text style={styles.chipText}>{item.term}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipPressed: {
    backgroundColor: colors.bgSection,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
});
