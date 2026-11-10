import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ShieldCheck, Building2, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export type CompanyBadgeVariant = 'micro' | 'pill' | 'banner';

interface CompanyBadgeProps {
  variant?: CompanyBadgeVariant;
  label?: string;
  ntnNumber?: string | null;
  style?: ViewStyle;
}

export const CompanyBadge: React.FC<CompanyBadgeProps> = ({
  variant = 'pill',
  label,
  ntnNumber,
  style,
}) => {
  const { companyTokens } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (variant === 'micro') {
    return (
      <View style={[styles.microContainer, style]}>
        <Building2 size={11} color={companyTokens.colors.verifiedBlue} strokeWidth={2.4} />
        <Text style={styles.microText} numberOfLines={1}>
          {label || 'Agency'}
        </Text>
      </View>
    );
  }

  if (variant === 'banner') {
    return (
      <View style={[styles.bannerContainer, style]}>
        <ShieldCheck size={16} color={companyTokens.colors.verifiedBlue} strokeWidth={2.2} />
        <View style={styles.bannerTextGroup}>
          <Text style={styles.bannerTitle}>
            {label || 'Verified Service Agency'}
          </Text>
          {ntnNumber ? (
            <Text style={styles.bannerSubtitle}>
              Registered Entity · {ntnNumber}
            </Text>
          ) : (
            <Text style={styles.bannerSubtitle}>
              Corporate Partner with TaskLync
            </Text>
          )}
        </View>
        <CheckCircle2 size={16} color={companyTokens.colors.escrowGreen} strokeWidth={2.4} />
      </View>
    );
  }

  // Default 'pill' variant
  return (
    <View style={[styles.pillContainer, style]}>
      <ShieldCheck size={12} color={companyTokens.colors.verifiedBlue} strokeWidth={2.4} />
      <Text style={styles.pillText} numberOfLines={1}>
        {label || (ntnNumber ? `NTN Verified` : 'Verified Agency')}
      </Text>
    </View>
  );
};

const createStyles = ({ companyTokens }: AppTheme) => StyleSheet.create({
  microContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: companyTokens.colors.verifiedBlueTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  microText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 10.5,
    color: companyTokens.colors.verifiedBlueDark,
    letterSpacing: 0.1,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: companyTokens.colors.verifiedBlueTint,
    borderWidth: 1,
    borderColor: companyTokens.colors.verifiedBlueBorder,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11.5,
    color: companyTokens.colors.verifiedBlueDark,
    letterSpacing: 0.1,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: companyTokens.colors.verifiedBlueTint,
    borderWidth: 1,
    borderColor: companyTokens.colors.verifiedBlueBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    width: '100%',
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: companyTokens.colors.corporatePrimary,
  },
  bannerSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11.5,
    color: companyTokens.colors.corporateMuted,
    marginTop: 1,
  },
});
