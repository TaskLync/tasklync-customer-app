import { useRef } from 'react';
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
import { useNavigationLock } from '../../src/hooks/useNavigationLock';
import { bookingIdempotency } from '../../src/services/booking/bookingIdempotency';

/**
 * payment-service answers PAYMENT_ALREADY_EXISTS only when this booking's payment is already HELD / RELEASED,
 * i.e. a previous tap went through and only its response was lost. That is success, not an error.
 */
const isAlreadyPaid = (code?: string) => code === 'PAYMENT_ALREADY_EXISTS';

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

  // The booking already exists: there is no way back to the summary (and its Confirm button) from here.
  // Header back is hidden, Android back / any back action is blocked, iOS swipe is off (app/_layout.tsx).
  const { release } = useNavigationLock(() => {
    showAlert(
      'Your booking is already placed',
      'This booking has been sent to your worker. Confirm Cash on Delivery to finish, or find it any time in My Bookings.',
      [
        { text: 'Stay here', style: 'cancel' },
        { text: 'Go to My Bookings', onPress: leaveToBookings },
      ]
    );
  });

  /** Checkout is over: the next booking is a new logical booking (new idempotency key, empty cart). */
  const finishCheckout = () => {
    clearCart();
    bookingIdempotency.clear();
  };

  const leaveToBookings = () => {
    finishCheckout();
    release();
    router.replace('/(tabs)/bookings' as any);
  };

  const goToSuccess = (id: string) => {
    finishCheckout();
    release();
    // replace: success must not be able to go "back" into this payment step either
    router.replace({ pathname: '/booking/success', params: { bookingId: id } } as any);
  };

  // Never creates a booking: it only records the payment method for the EXISTING booking. The backend keeps one
  // payment per booking (UNIQUE booking_id) and re-confirming COD is an upsert, so a retry is harmless.
  const paying = useRef(false);
  const handlePay = async () => {
    if (paying.current || isLoading) return;
    // If not a production UUID or testing without an existing backend record
    if (!bookingId || bookingId.startsWith('b-') || bookingId.startsWith('TL-')) {
      goToSuccess(bookingId || 'TL-CONFIRMED');
      return;
    }

    paying.current = true;
    let outcome: Awaited<ReturnType<typeof initiateCodPayment>>;
    try {
      outcome = await initiateCodPayment(
        bookingId,
        amountToPay > 0 ? amountToPay : undefined,
        booking?.worker_id
      );
    } finally {
      paying.current = false;
    }
    const { success, error, code } = outcome;

    if (success || isAlreadyPaid(code)) {
      goToSuccess(bookingId);
    } else {
      showAlert(
        "Couldn't confirm payment",
        error || paymentError || 'Check your connection and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />
      <View style={styles.container}>
        {/* Header: title only. No back control: the booking is already placed. */}
        <PaymentHeader title="Payment" showBack={false} />

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
