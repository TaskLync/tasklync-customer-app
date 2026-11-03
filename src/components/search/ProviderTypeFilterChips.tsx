import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Building2, User, Sparkles } from 'lucide-react-native';
import { colors } from '../../design/colors';
import { companyTokens } from '../../theme/companyTokens';

export type ProviderTypeFilter = 'ALL' | 'INDIVIDUAL' | 'COMPANY';

interface ProviderTypeFilterChipsProps {
  selected: ProviderTypeFilter;
  onSelect: (filter: ProviderTypeFilter) => void;
}

export const ProviderTypeFilterChips: React.FC<ProviderTypeFilterChipsProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
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
          color={selected === 'ALL' ? colors.white : colors.textSecondary}
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
          color={selected === 'INDIVIDUAL' ? colors.white : colors.textSecondary}
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
          selected === 'COMPANY' && styles.chipCompanySelected,
        ]}
        onPress={() => onSelect('COMPANY')}
        accessibilityRole="button"
        accessibilityLabel="Show registered agencies only"
      >
        <Building2
          size={13}
          color={selected === 'COMPANY' ? colors.white : companyTokens.colors.verifiedBlue}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: companyTokens.colors.borderSubtle,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipCompanySelected: {
    backgroundColor: companyTokens.colors.corporatePrimary,
    borderColor: companyTokens.colors.corporatePrimary,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.white,
  },
});
