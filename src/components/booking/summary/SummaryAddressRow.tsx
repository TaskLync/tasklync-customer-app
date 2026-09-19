import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Home, Briefcase } from 'lucide-react-native';
import { SummarySectionCard } from './SummarySectionCard';
import { BookingAddress } from '../../../store/bookingDraft.store';
import { AddressDefaultBadge } from '../../address/AddressDefaultBadge';
import { colors, fontFamily } from '../../../design';

export interface SummaryAddressRowProps {
  address: BookingAddress | null;
}

export const SummaryAddressRow: React.FC<SummaryAddressRowProps> = ({ address }) => {
  const label = address?.label || 'Service Location';
  const street = address?.street || 'Select delivery address';
  const unit = address?.unit;
  const city = address?.city || 'Faisalabad';
  const isDefault = address?.isDefault;

  const renderLabelIcon = () => {
    const lower = label.toLowerCase();
    if (lower.includes('home')) {
      return <Home size={16} color={colors.primaryDark} strokeWidth={2.2} />;
    }
    if (lower.includes('office') || lower.includes('work')) {
      return <Briefcase size={16} color={colors.primaryDark} strokeWidth={2.2} />;
    }
    return <MapPin size={16} color={colors.primaryDark} strokeWidth={2.2} />;
  };

  return (
    <SummarySectionCard
      icon={renderLabelIcon()}
      title="Delivery Location"
    >
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.labelTitle}>{label}</Text>
          {isDefault && <AddressDefaultBadge />}
        </View>

        <Text style={styles.addressLine} numberOfLines={2}>
          {street}
          {unit ? `, ${unit}` : ''}
        </Text>
        <Text style={styles.cityText}>{city}</Text>
      </View>
    </SummarySectionCard>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  addressLine: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  cityText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 2,
  },
});
