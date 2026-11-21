import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ClockIcon, CloseIcon } from '../ui/Icon/icons';
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
      <View style={styles.headerRow}>
        <Text style={styles.header} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          Recent
        </Text>
        <Pressable onPress={onClearAll} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear recent searches">
          <Text style={styles.clearAllText} maxFontSizeMultiplier={1.3}>
            Clear all
          </Text>
        </Pressable>
      </View>

      {searches.map((term, index) => (
        <Pressable
          key={`${term}-${index}`}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => onSelect(term)}
          accessibilityRole="button"
          accessibilityLabel={`Search for ${term}`}
        >
          <ClockIcon size={16} strokeWidth={2} color={colors.textMuted} />
          <Text style={styles.term} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {term}
          </Text>
          <Pressable
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation();
              onRemove(term);
            }}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${term} from recent searches`}
          >
            <CloseIcon size={15} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingTop: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 4,
    },
    header: {
      fontFamily: typography.fontFamily.jakarta.semiBold,
      fontSize: 15.5,
      color: colors.textPrimary,
    },
    clearAllText: {
      fontFamily: typography.fontFamily.jakarta.medium,
      fontSize: 13,
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 46,
      paddingHorizontal: 20,
      gap: 12,
    },
    rowPressed: {
      backgroundColor: colors.bgHover,
    },
    term: {
      flex: 1,
      fontFamily: typography.fontFamily.jakarta.regular,
      fontSize: 15,
      color: colors.textPrimary,
    },
    removeBtn: {
      padding: 4,
    },
  });
