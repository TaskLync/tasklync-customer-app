import { useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Design system
import { validateServiceArea, SERVICE_UNAVAILABLE_MESSAGE } from '../../src/config/serviceArea.config';

// Store & Hooks
import { useBookingDraftStore, BookingAddress } from '../../src/store/bookingDraft.store';

// Funnel Primitive & Footer
import { StepProgress } from '../../src/components/booking/StepProgress';
import { BookingFooterCTA } from '../../src/components/booking/BookingFooterCTA';

// Address Components
import { AddressHeader } from '../../src/components/address/AddressHeader';
import { AddressList } from '../../src/components/address/AddressList';
import { AddNewAddressRow } from '../../src/components/address/AddNewAddressRow';
import { AddAddressBottomSheet, AddAddressBottomSheetRef } from '../../src/components/address/AddAddressBottomSheet';
import { RouteErrorBoundary } from '../../src/components/feedback';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';

export { RouteErrorBoundary as ErrorBoundary };

export default function AddressScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addAddressSheetRef = useRef<AddAddressBottomSheetRef>(null);

  const { addressId, address, setAddress, hydrate } = useBookingDraftStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleSelectAddress = (selected: BookingAddress) => {
    setAddress(selected);
  };

  const handleOpenAddSheet = () => {
    addAddressSheetRef.current?.open();
  };

  const handleContinue = () => {
    if (address?.latitude && address?.longitude) {
      const validation = validateServiceArea({ lat: address.latitude, lng: address.longitude });
      if (!validation.isServiceable) {
        showAlert('Service Unavailable', SERVICE_UNAVAILABLE_MESSAGE);
        return;
      }
    }
    router.push('/booking/summary' as any);
  };

  const isEnabled = Boolean(addressId || address);
  const subtext = address ? `${address.label || 'Selected'}: ${address.street}` : 'Select or add a delivery address';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />
      <View style={styles.container}>
        {/* Screen Header */}
        <AddressHeader />

        {/* Funnel Step Progress Primitive (Step 3 of 4: Address) */}
        <StepProgress currentStep={3} />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Saved Addresses List */}
          <AddressList
            selectedAddressId={addressId}
            onSelectAddress={handleSelectAddress}
          />

          {/* Add New Address Button */}
          <AddNewAddressRow onPress={handleOpenAddSheet} />

          {/* Bottom Spacer for Sticky Footer */}
          <View style={{ height: 112 + insets.bottom }} />
        </ScrollView>

        {/* Sticky Continue Footer CTA */}
        <BookingFooterCTA
          label="Next: Review →"
          subtext={subtext}
          enabled={isEnabled}
          onPress={handleContinue}
        />

        {/* Add Address Modal Bottom Sheet */}
        <AddAddressBottomSheet
          ref={addAddressSheetRef}
          onAddressCreated={handleSelectAddress}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.white,
  },
  container: {
    flex: 1,
    backgroundColor: palette.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  footerSpacer: {
    height: 120,
  },
});
