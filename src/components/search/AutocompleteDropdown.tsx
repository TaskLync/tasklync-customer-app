import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Layers, User, ArrowUpRight } from 'lucide-react-native';
import { AutocompleteSuggestion } from '../../types/search.types';
import { colors, palette } from '../../design/colors';
import { typography } from '../../design/typography';

interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  onSelect: (item: AutocompleteSuggestion) => void;
  visible: boolean;
}

export const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  suggestions,
  onSelect,
  visible,
}) => {
  if (!visible || !suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      {suggestions.map((item, index) => {
        const isCategory = item.type === 'category';
        const isLast = index === suggestions.length - 1;

        return (
          <Pressable
            key={`${item.type}-${item.category_id || item.worker_id || item.label}-${index}`}
            style={({ pressed }) => [
              styles.row,
              isLast && styles.rowLast,
              pressed && styles.rowPressed,
            ]}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${isCategory ? 'Category' : 'Provider'}`}
          >
            <View style={[styles.iconWrap, isCategory ? styles.categoryIconWrap : styles.workerIconWrap]}>
              {isCategory ? (
                <Layers size={15} color={colors.primary} />
              ) : (
                <User size={15} color={palette.blue600} />
              )}
            </View>

            <View style={styles.labelContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.mainLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.label_ur ? (
                  <Text style={styles.urduLabel} numberOfLines={1}>
                    ({item.label_ur})
                  </Text>
                ) : null}
              </View>
              <Text style={styles.typeSubLabel}>
                {isCategory ? 'Service Category' : 'Verified Professional'}
              </Text>
            </View>

            <ArrowUpRight size={16} color={colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: colors.bgSection,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconWrap: {
    backgroundColor: colors.primaryTint,
  },
  workerIconWrap: {
    backgroundColor: palette.blue50,
  },
  labelContainer: {
    flex: 1,
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainLabel: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  urduLabel: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  typeSubLabel: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 11.5,
    color: colors.textMuted,
  },
});
