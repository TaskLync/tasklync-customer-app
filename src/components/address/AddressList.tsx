import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { BookingAddress, useBookingDraftStore } from '../../store/bookingDraft.store';
import { Address } from '../../types/address.types';
import { useAddresses } from '../../hooks/useAddresses';
import { AddressCard } from './AddressCard';
import { AddressCardSkeleton } from './AddressCardSkeleton';
import { colors, palette, fontFamily } from '../../design';

export interface AddressListProps {
  selectedAddressId: string | null;
  onSelectAddress: (address: BookingAddress) => void;
}

const AnyFlashList = FlashList as any;

export const AddressList: React.FC<AddressListProps> = ({
  selectedAddressId,
  onSelectAddress,
}) => {
  const { addresses, isLoading, isError, refetch } = useAddresses();
  const setAddressStore = useBookingDraftStore((s) => s.setAddress);

  // Auto-select default address if no address is selected yet
  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
      if (defaultAddr) {
        setAddressStore({
          id: defaultAddr.id,
          label: defaultAddr.label,
          street: defaultAddr.address_line,
          city: defaultAddr.city || 'Faisalabad',
          latitude: defaultAddr.lat,
          longitude: defaultAddr.lng,
          isDefault: Boolean(defaultAddr.is_default),
        });
      }
    }
  }, [addresses, selectedAddressId, setAddressStore]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 2 }).map((_, idx) => (
          <AddressCardSkeleton key={`addr-skel-${idx}`} delayMs={0} />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={20} color={palette.danger} />
        <View style={styles.errorTextWrap}>
          <Text style={styles.errorTitle}>Couldn&apos;t load addresses</Text>
          <Text style={styles.errorSubtitle}>Please check your connection and retry</Text>
        </View>
        <Pressable
          onPress={() => refetch()}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Retry loading addresses"
        >
          <RefreshCw size={14} color={colors.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (addresses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No saved delivery addresses</Text>
        <Text style={styles.emptySubtext}>Please add your delivery address below to proceed.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnyFlashList
        data={addresses}
        estimatedItemSize={76}
        keyExtractor={(item: Address) => item.id}
        renderItem={({ item }: { item: Address }) => (
          <View style={styles.cardItemWrap}>
            <AddressCard
              address={item}
              isSelected={selectedAddressId === item.id}
              onSelect={(selected) => {
                onSelectAddress({
                  id: selected.id,
                  label: selected.label,
                  street: selected.address_line,
                  city: selected.city || 'Faisalabad',
                  latitude: selected.lat,
                  longitude: selected.lng,
                  isDefault: Boolean(selected.is_default),
                });
              }}
            />
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  cardItemWrap: {
    marginBottom: 10,
  },
  emptyContainer: {
    padding: 20,
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 14,
    color: palette.gray900,
  },
  errorSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: palette.gray600,
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
});
