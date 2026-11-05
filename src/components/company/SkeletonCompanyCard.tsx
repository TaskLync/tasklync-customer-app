import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonGroup,
  SkeletonText,
} from '../ui/Skeleton/Skeleton';
import { colors } from '../../design/colors';
import { companyTokens } from '../../theme/companyTokens';

const PILL_WIDTHS = [72, 88, 64];

/**
 * Mirrors the company card on the Companies screen (app/company/index.tsx): static bordered
 * shell, 54px logo, name / fleet badge / rating lines, chevron, and the category pill row.
 */
export const SkeletonCompanyCard: React.FC = () => (
  <View style={styles.card}>
    <SkeletonGroup accessibilityLabel="Loading company">
      <View style={styles.header}>
        <SkeletonCircle size={54} style={styles.logo} />
        <View style={styles.info}>
          <SkeletonText fontSize={15} lineHeight={20} width="62%" style={styles.name} />
          <Skeleton width={96} height={18} borderRadius={6} style={styles.badge} />
          <SkeletonText fontSize={12} lineHeight={16} width="48%" />
        </View>
      </View>
      <View style={styles.categories}>
        {PILL_WIDTHS.map((w) => (
          <Skeleton key={w} width={w} height={23} borderRadius={8} />
        ))}
      </View>
    </SkeletonGroup>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: companyTokens.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    marginBottom: 3,
  },
  badge: {
    marginBottom: 4,
  },
  categories: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
});
