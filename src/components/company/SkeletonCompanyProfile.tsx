import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Skeleton,
  SkeletonGroup,
  SkeletonText,
  SKELETON,
} from '../ui/Skeleton/Skeleton';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const PAGE_PADDING = 20;

/**
 * Mirrors the company profile body (app/company/[id].tsx) below its real top bar:
 * 60px logo tile + name/verified line, the facts row, then the Services list (CompanyServiceRow).
 */
export const SkeletonCompanyProfile: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
  <SkeletonGroup style={styles.body} accessibilityLabel="Loading company">
    <View style={styles.identityRow}>
      <Skeleton width={60} height={60} borderRadius={16} />
      <View style={styles.identityText}>
        <SkeletonText fontSize={20} lineHeight={28} width="64%" />
        <SkeletonText fontSize={13} lineHeight={18} width={104} style={styles.verified} />
      </View>
    </View>

    <View style={styles.factsRow}>
      <SkeletonText fontSize={13} lineHeight={18} width={96} />
      <SkeletonText fontSize={13} lineHeight={18} width={68} />
      <SkeletonText fontSize={13} lineHeight={18} width={124} />
    </View>

    <View style={styles.section}>
      <SkeletonText fontSize={16} lineHeight={22} width={72} style={styles.sectionTitle} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.serviceRow, i > 0 && styles.divider]}>
          <View style={styles.serviceInfo}>
            <SkeletonText fontSize={14} lineHeight={20} width="70%" />
            <SkeletonText fontSize={13} lineHeight={18} width={60} style={styles.price} />
          </View>
          <Skeleton width={80} height={32} borderRadius={SKELETON.radius.pill} />
        </View>
      ))}
    </View>
  </SkeletonGroup>
);
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  body: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 8,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityText: {
    flex: 1,
  },
  verified: {
    marginTop: 2,
  },
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 8,
    marginTop: 16,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    minHeight: 56,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  serviceInfo: {
    flex: 1,
  },
  price: {
    marginTop: 4,
  },
});
