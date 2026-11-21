import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SummarySectionCard } from './SummarySectionCard';
import { BookingAddress } from '../../../store/bookingDraft.store';
import { fontFamily } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SummaryAddressRowProps {
  address: BookingAddress | null;
}

export const SummaryAddressRow: React.FC<SummaryAddressRowProps> = ({ address }) => {
  const styles = useThemedStyles(createStyles);
  const line = address ? [address.street, address.unit, address.city].filter(Boolean).join(', ') : '';

  return (
    <SummarySectionCard title="Address">
      {address ? (
        <>
          {address.label ? <Text style={styles.labelTitle}>{address.label}</Text> : null}
          <Text style={address.label ? styles.addressLine : styles.labelTitle} numberOfLines={2}>
            {line}
          </Text>
        </>
      ) : (
        <Text style={styles.labelTitle}>Not selected</Text>
      )}
    </SummarySectionCard>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  labelTitle: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  addressLine: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
