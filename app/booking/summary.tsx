import { useEffect } from 'react';
import { View, ScrollView, Alert, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Design system
import { palette } from '../../src/design';

// Stores & Hooks
import { useCartStore } from '../../src/store/cart.store';
import { useBookingDraftStore } from '../../src/store/bookingDraft.store';
import { useBookingEstimate } from '../../src/hooks/useBookingEstimate';
import { useCreateBooking } from '../../src/hooks/useCreateBooking';

// Funnel Primitive & Shared Footer
import { StepProgress } from '../../src/components/booking/StepProgress';
import { BookingFooterCTA } from '../../src/components/booking/BookingFooterCTA';

// Summary Subcomponents
import { ScheduleHeader } from '../../src/components/booking/schedule/ScheduleHeader';
import { SummaryWorkerRow } from '../../src/components/booking/summary/SummaryWorkerRow';
import { SummaryServicesList } from '../../src/components/booking/summary/SummaryServicesList';
import { SummaryScheduleRow } from '../../src/components/booking/summary/SummaryScheduleRow';
import { SummaryAddressRow } from '../../src/components/booking/summary/SummaryAddressRow';
import { DescriptionInput } from '../../src/components/booking/summary/DescriptionInput';
import { BookingPriceSummary } from '../../src/components/booking/BookingPriceSummary';
import { AcceptanceWindowBanner } from '../../src/components/booking/summary/AcceptanceWindowBanner';

export default function SummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Stores
  const cartItems = useCartStore((s) => s.items);
  const cartWorker = useCartStore((s) => s.worker);

  const {
    selectedDate,
    selectedTimeSlot,
    isUrgent,
    address,
    note,
    setNote,
    hydrate,
  } = useBookingDraftStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Derived estimate hook
  const { subtotal, platformFee, urgentFee, discount, total } = useBookingEstimate();

  // Create booking mutation hook
  const { submit, isLoading, error: createError } = useCreateBooking();

  const handleConfirmBooking = async () => {
    const { booking, error: submitError, conflict } = await submit();
    if (booking && booking.id) {
      // Navigate directly to payment screen
      router.push({
        pathname: '/booking/payment',
        params: { bookingId: booking.id },
      } as any);
    } else if (conflict) {
      Alert.alert('Slot no longer available', submitError || 'Please pick another time slot.', [
        { text: 'Choose another slot', onPress: () => router.replace('/booking/schedule' as any) },
      ]);
    } else {
      Alert.alert('Booking Error', submitError || createError || 'Unable to confirm booking. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.white} />
      <View style={styles.container}>
        {/* Screen Header */}
        <ScheduleHeader
          title="Review & confirm"
        />

        {/* Funnel Step Progress Primitive (Step 4 of 4: Review) */}
        <StepProgress currentStep={4} />

        {/* Scrollable Content with Fixed Serial Position Order */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Worker Identity Row */}
          <SummaryWorkerRow worker={cartWorker} />

          {/* 2. Services Requested Row */}
          <SummaryServicesList items={cartItems} />

          {/* 3. Schedule & Arrival Row */}
          <SummaryScheduleRow
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            isUrgent={isUrgent}
          />

          {/* 4. Delivery Address Row */}
          <SummaryAddressRow address={address} />

          {/* 5. Collapsed Special Instructions Note */}
          <DescriptionInput value={note} onChangeText={setNote} />

          {/* 6. Pricing Summary Breakdown */}
          <BookingPriceSummary
            subtotal={subtotal}
            platformFee={platformFee}
            urgentFee={urgentFee}
            discount={discount}
            total={total}
          />

          {/* 7. Acceptance Window Expectations Banner */}
          <AcceptanceWindowBanner />

          {/* Bottom Spacer for Sticky Footer */}
          <View style={{ height: 112 + insets.bottom }} />
        </ScrollView>

        {/* Sticky Primary Confirmation Footer CTA */}
        <BookingFooterCTA
          label="Confirm & Proceed to Pay"
          subtext={`Total: Rs. ${total.toLocaleString()}`}
          enabled={true}
          loading={isLoading}
          onPress={handleConfirmBooking}
          accessibilityLabel={`Confirm booking for total Rs. ${total.toLocaleString()}`}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.zenWhite,
  },
  container: {
    flex: 1,
    backgroundColor: palette.zenWhite,
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
