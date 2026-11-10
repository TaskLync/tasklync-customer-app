import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ShieldCheck, FileText, MessageCircle, LifeBuoy, LucideIcon } from 'lucide-react-native';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { useAppTheme } from '../../theme/useAppTheme';

interface CompanyTrustGuaranteeCardProps {
  /** True only when the backend reports this agency as verified. */
  isVerified?: boolean;
  /** Registered NTN, shown only when present in the API response. */
  ntnNumber?: string | null | undefined;
  style?: ViewStyle;
}

interface TrustItem {
  key: string;
  Icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * Lightweight trust section. Only lists assurances the app/backend actually supports:
 *  - verification (data-driven)
 *  - NTN on file (data-driven)
 *  - in-app chat with the provider (chat module)
 *  - dispute reporting on bookings (dispute module)
 * Escrow, background checks and warranty are intentionally NOT claimed because no
 * backend policy/flag confirms them.
 */
export const CompanyTrustGuaranteeCard: React.FC<CompanyTrustGuaranteeCardProps> = ({
  isVerified = false,
  ntnNumber,
  style,
}) => {
  const { companyTokens } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const items: TrustItem[] = [];

  if (isVerified) {
    items.push({
      key: 'verified',
      Icon: ShieldCheck,
      title: 'Verified by TaskLync',
      body: 'This agency has passed TaskLync verification.',
    });
  }
  if (ntnNumber) {
    items.push({
      key: 'ntn',
      Icon: FileText,
      title: 'Registered business',
      body: `NTN ${ntnNumber} is on file.`,
    });
  }
  items.push({
    key: 'chat',
    Icon: MessageCircle,
    title: 'Talk before you commit',
    body: 'Message the agency in the app about your booking.',
  });
  items.push({
    key: 'dispute',
    Icon: LifeBuoy,
    title: 'Help if something goes wrong',
    body: 'Report a problem from any booking and our team will review it.',
  });

  return (
    <View style={style} accessibilityRole="summary">
      <Text style={styles.heading}>Booking with confidence</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <View
            key={item.key}
            style={[styles.row, index > 0 && styles.rowDivider]}
            accessible
            accessibilityLabel={`${item.title}. ${item.body}`}
          >
            <item.Icon size={18} color={companyTokens.colors.corporateSecondary} strokeWidth={2} />
            <View style={styles.rowText}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = ({ colors, companyTokens }: AppTheme) => StyleSheet.create({
  heading: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: companyTokens.colors.borderSubtle,
  },
  rowText: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
