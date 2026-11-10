import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { Building2, User, Sparkles } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export type ProviderTypeFilter = 'ALL' | 'INDIVIDUAL' | 'COMPANY';

interface ProviderTypeFilterChipsProps {
  selected: ProviderTypeFilter;
  onSelect: (filter: ProviderTypeFilter) => void;
}

export const ProviderTypeFilterChips: React.FC<ProviderTypeFilterChipsProps> = ({
  selected,
  onSelect,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Option 1: All */}
      <Pressable
        style={[
          styles.chip,
          selected === 'ALL' && styles.chipSelected,
        ]}
        onPress={() => onSelect('ALL')}
        accessibilityRole="button"
        accessibilityLabel="Show all providers"
      >
        <Sparkles
          size={13}
          color={selected === 'ALL' ? colors.textPrimary : colors.textSecondary}
        />
        <Text
          style={[
            styles.chipText,
            selected === 'ALL' && styles.chipTextSelected,
          ]}
        >
          All Providers
        </Text>
      </Pressable>

      {/* Option 2: Solo Handymen */}
      <Pressable
        style={[
          styles.chip,
          selected === 'INDIVIDUAL' && styles.chipSelected,
        ]}
        onPress={() => onSelect('INDIVIDUAL')}
        accessibilityRole="button"
        accessibilityLabel="Show independent craftsmen only"
      >
        <User
          size={13}
          color={selected === 'INDIVIDUAL' ? colors.textPrimary : colors.textSecondary}
        />
        <Text
          style={[
            styles.chipText,
            selected === 'INDIVIDUAL' && styles.chipTextSelected,
          ]}
        >
          Solo Craftsmen
        </Text>
      </Pressable>

      {/* Option 3: Verified Agencies */}
      <Pressable
        style={[
          styles.chip,
          selected === 'COMPANY' && styles.chipSelected,
        ]}
        onPress={() => onSelect('COMPANY')}
        accessibilityRole="button"
        accessibilityLabel="Show registered agencies only"
      >
        <Building2
          size={13}
          color={selected === 'COMPANY' ? colors.textPrimary : colors.textSecondary}
        />
        <Text
          style={[
            styles.chipText,
            selected === 'COMPANY' && styles.chipTextSelected,
          ]}
        >
          Verified Agencies
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    // grey fill; the border matches it until selected, so selecting never shifts the layout
    backgroundColor: colors.bgInput,
    borderWidth: 1.25,
    borderColor: colors.bgInput,
  },
  chipSelected: {
    backgroundColor: colors.bgCard,
    borderColor: colors.textPrimary,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.textPrimary,
  },
});
