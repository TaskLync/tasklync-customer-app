import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Hooks & APIs
import { useCartStore } from '../../src/store/cart.store';
import { useBookingDetails } from '../../src/hooks/useBookingDetails';
import { usePayment } from '../../src/hooks/usePayment';
import { getPersistedBookings } from '../../src/services/api/booking.api';
import { DiscountSummaryRow } from '../../src/components/offers/DiscountSummaryRow';

// Components
import {
  PaymentHeader,
  PaymentAmountCard,
  PaymentMethodSelectCard,
  PaymentStickyFooter,
} from '../../src/components/payment';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';

export default function PaymentScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId || null;

  const clearCart = useCartStore((s) => s.clearCart);

  const { booking } = useBookingDetails(bookingId);

  // The booking just created is already stored locally with its DISCOUNTED total; use it until the
  // server copy arrives so the cash amount never flashes the undiscounted estimate.
  const savedBooking = bookingId ? getPersistedBookings().find((b) => b.id === bookingId) : undefined;
  const bookingRecord = booking ?? savedBooking;

  // Authoritative amount to pay: the booking's own (already discounted) total. Never a guess.
  const amountToPay = bookingRecord?.estimated_total ?? 0;

  // Process payment hook
  const { initiateCodPayment, isLoading, error: paymentError } = usePayment();

  const handlePay = async () => {
    // If not a production UUID or testing without an existing backend record
    if (!bookingId || bookingId.startsWith('b-') || bookingId.startsWith('TL-')) {
      clearCart();
      router.push({
        pathname: '/booking/success',
        params: { bookingId: bookingId || 'TL-CONFIRMED' },
      } as any);
      return;
    }

    const { success, error } = await initiateCodPayment(
      bookingId,
      amountToPay > 0 ? amountToPay : undefined,
      booking?.worker_id
    );

    if (success) {
      clearCart();
      router.push({
        pathname: '/booking/success',
        params: { bookingId },
      } as any);
    } else {
      showAlert(
        'Booking Confirmation',
        error || paymentError || 'Payment confirmation failed. Please check your connection and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />
      <View style={styles.container}>
        {/* Header: Back button + Title "Payment" */}
        <PaymentHeader title="Payment" />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. What am I paying? Amount to pay card */}
          <PaymentAmountCard total={amountToPay} />
          <DiscountSummaryRow booking={bookingRecord} style={styles.savings} />

          {/* 2. How am I paying? Payment method selection card */}
          <PaymentMethodSelectCard />

          {/* Bottom spacer so content doesn't get covered by sticky footer */}
          <View style={{ height: 112 + insets.bottom }} />
        </ScrollView>

        {/* 3. Confirm my booking: Bottom sticky checkout area */}
        <PaymentStickyFooter
          total={amountToPay}
          loading={isLoading || amountToPay <= 0}
          onPress={handlePay}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  footerSpacer: {
    height: 110,
  },
  savings: {
    marginTop: 12,
  },
});
