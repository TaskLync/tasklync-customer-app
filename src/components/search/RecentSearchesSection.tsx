import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface RecentSearchesSectionProps {
  searches: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
}

export const RecentSearchesSection: React.FC<RecentSearchesSectionProps> = ({
  searches,
  onSelect,
  onRemove,
  onClearAll,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (!searches || searches.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent Searches</Text>
      
      {searches.map((term, index) => (
        <Pressable
          key={`${term}-${index}`}
          style={({ pressed }) => [
            styles.row,
            pressed && styles.rowPressed,
          ]}
          onPress={() => {
            onSelect(term);
          }}
        >
          <Search size={16} color={colors.textMuted} />
          <Text style={styles.term} numberOfLines={1}>
            {term}
          </Text>
          <Pressable
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation();
              onRemove(term);
            }}
            style={styles.removeBtn}
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}

      <Pressable
        style={styles.clearAllBtn}
        onPress={() => {
          onClearAll();
        }}
        hitSlop={8}
      >
        <Text style={styles.clearAllText}>Clear all</Text>
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: colors.bgSection,
  },
  term: {
    flex: 1,
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  removeBtn: {
    padding: 4,
  },
  clearAllBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  clearAllText: {
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
});
