import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

// Design system
import { fontFamily } from '../../src/design';

// Stores & Hooks
import { useCartStore } from '../../src/store/cart.store';
import { useBookingDraftStore } from '../../src/store/bookingDraft.store';
import { useCreateBooking, type DiscountFailure, type SubmitResult } from '../../src/hooks/useCreateBooking';
import { useBookingQuoteParams } from '../../src/hooks/useBookingQuoteParams';
import { usePromoCode } from '../../src/hooks/usePromoCode';
import { useCheckoutOffers } from '../../src/hooks/useCheckoutOffers';

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
import { SummarySectionCard } from '../../src/components/booking/summary/SummarySectionCard';
import { CheckoutOffersSection } from '../../src/components/offers/CheckoutOffersSection';
import { appliedDiscountName, buildPriceSummaryRows, discountValueLabel } from '../../src/utils/offers';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';
import { BookingIssueSheet, type BookingIssueKind } from '../../src/components/booking/BookingIssueSheet';
import { invalidateAvailability } from '../../src/utils/availabilityEvents';
import { checkoutHold } from '../../src/services/booking/checkoutHold';
import { usePayment } from '../../src/hooks/usePayment';
import { bookingIdempotency } from '../../src/services/booking/bookingIdempotency';
import type { BookingDetails } from '../../src/types/booking.types';

export default function SummaryScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Stores
  const cartItems = useCartStore((s) => s.items);
  const cartWorker = useCartStore((s) => s.worker);
  const clearCart = useCartStore((s) => s.clearCart);

  const {
    selectedDate,
    selectedTimeSlot,
    address,
    note,
    setNote,
    hydrate,
  } = useBookingDraftStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Create booking mutation hook
  const { submit, isLoading, error: createError } = useCreateBooking();
  const queryClient = useQueryClient();

  // ── Pricing: the server prices this booking (cart lines, surge, worker offer, coupon). The app shows it. ──
  const quoteParams = useBookingQuoteParams();
  const checkout = useCheckoutOffers(quoteParams);
  // Custom-quote pricing has no discount path in the backend, so the offers UI is hidden for it.
  const isQuotePricing = checkout.offers?.pricing.price_type === 'quote';
  const promo = usePromoCode(quoteParams, !isQuotePricing);

  // A previewed coupon is server pricing for exactly this booking; otherwise the no-code server price
  // (automatic worker offer included) stands. Neither is computed here.
  const pricing = (isQuotePricing ? null : promo.pricing) ?? checkout.offers?.pricing ?? null;
  const appliedDiscount = promo.pricing && promo.applied ? promo.applied.discount : checkout.offers?.discount.applied ?? null;
  const priceReady = pricing !== null && !promo.isBusy && !checkout.isFetching;
  const displayTotal = pricing?.estimated_total ?? 0;
  const priceRows = pricing
    ? buildPriceSummaryRows({
        originalAmount: pricing.subtotal_before_discount,
        baseAmount: pricing.base_price,
        platformFee: pricing.platform_fee,
        platformFeePercent: pricing.customer_fee_percent,
        taxAmount: pricing.tax_amount,
        taxLabel: pricing.tax_label,
        taxPercent: pricing.tax_percent,
        discount: appliedDiscount
          ? {
              name: appliedDiscountName(appliedDiscount),
              valueLabel: discountValueLabel(appliedDiscount.discount_type, appliedDiscount.discount_value),
              amount: pricing.discount_on_subtotal,
            }
          : null,
      })
    : [];

  const scrollRef = useRef<ScrollView>(null);
  const promoY = useRef(0);
  const scrollToPromo = () => {
    // Wait for the keyboard to start opening, then bring the field above it.
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, promoY.current - 24), animated: true }), 120);
  };

  // COD only: the Payment screen is bypassed (kept in code, no longer reached). What it did on "pay" happens here:
  // record COD for the booking, then finish checkout and show Success.
  const { initiateCodPayment, isLoading: isPaying } = usePayment();

  /** Checkout is over: the next booking is a new logical booking (new idempotency key, empty cart). */
  const finishCheckout = () => {
    clearCart();
    bookingIdempotency.clear();
  };

  const goToSuccess = async (booking: BookingDetails) => {
    const bookingId = booking.id;
    promo.reset();
    queryClient.invalidateQueries({ queryKey: ['bookings-list'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['active-booking'] });
    // A used coupon may no longer be offered (usage limits).
    queryClient.invalidateQueries({ queryKey: ['checkout-offers'] });

    // Same rule as the Payment screen: test / local ids have no backend record to pay against.
    if (!bookingId.startsWith('b-') && !bookingId.startsWith('TL-')) {
      const amount = booking.estimated_total ?? 0;
      const { success, error, code } = await initiateCodPayment(
        bookingId,
        amount > 0 ? amount : undefined,
        booking.worker_id
      );
      // PAYMENT_ALREADY_EXISTS: an earlier attempt went through and only its response was lost.
      if (!success && code !== 'PAYMENT_ALREADY_EXISTS') {
        // The booking exists. Tapping Confirm again re-sends the same idempotency key, so the server returns
        // this same booking and COD is retried (re-confirming COD is an upsert on the backend).
        showAlert("Couldn't confirm payment", error || 'Check your connection and try again.', [
          { text: 'Try again', onPress: () => { goToSuccess(booking); } },
          {
            text: 'Go to My Bookings',
            style: 'cancel',
            onPress: () => {
              finishCheckout();
              router.replace('/(tabs)/bookings' as any);
            },
          },
        ]);
        return;
      }
    }

    finishCheckout();
    // REPLACE, not push: the booking now exists, so this summary (and its Confirm button) must leave the history.
    router.replace({ pathname: '/booking/success', params: { bookingId } } as any);
  };

  const handleDiscountFailure = (failure: DiscountFailure) => {
    if (failure.kind === 'continue_without') {
      // Whatever was applied is gone or unusable now; the booking continues at the price without it.
      promo.remove();
      if (failure.code === 'COUPON_ATTEMPTS_LOCKED') promo.markLocked(failure.message);
      showAlert('Discount unavailable', failure.message, [
        { text: 'Review booking', style: 'cancel' },
        {
          text: 'Continue without it',
          onPress: async () => {
            const retry = await submit({});
            if (retry.booking && retry.booking.id) await goToSuccess(retry.booking);
            else handleSubmitFailure(retry);
          },
        },
      ]);
      return;
    }
    // The code no longer applies: drop it and return to the original price.
    promo.rejectApplied(failure.message);
    showAlert('Promo code removed', failure.message);
    scrollToPromo();
  };

  // Booking could not be confirmed: what happened is decided by the backend's answer only.
  const [issue, setIssue] = useState<{ kind: BookingIssueKind; reason: string | null; attemptRef: string | null } | null>(null);

  const handleSubmitFailure = (result: SubmitResult) => {
    if (result.discountFailure) {
      handleDiscountFailure(result.discountFailure);
      return;
    }
    const f = result.failure;
    if (f && f.kind !== 'other') {
      setIssue({ kind: f.kind, reason: f.reason, attemptRef: f.attemptRef });
      return;
    }
    showAlert("Couldn't place your booking", result.error || createError || 'Please try again.');
  };

  // Synchronous latch: isLoading is React state and only flips on the next render, so two taps inside the same
  // frame would both pass an isLoading check. The hook's inFlight ref guards the request too; this guards the UI flow.
  const confirming = useRef(false);

  const handleConfirmBooking = async () => {
    if (confirming.current || isLoading || isPaying || promo.isBusy || !priceReady) return;
    confirming.current = true;
    let result: SubmitResult;
    try {
      result = await submit({ couponCode: promo.codeForSubmit });
    } finally {
      // Released after every outcome: a timeout must never leave the button dead. A retry re-sends the SAME
      // idempotency key, so if the first request did create the booking, the server returns that booking.
      confirming.current = false;
    }
    if (result.booking && result.booking.id) {
      // booking-service released the checkout hold together with creating the booking
      checkoutHold.forget();
      await goToSuccess(result.booking);
    } else {
      handleSubmitFailure(result);
    }
  };

  // Back to the calendar. Everything else the customer entered (address, note, services, coupon) stays.
  const backToSchedule = (dropSlot: boolean) => {
    setIssue(null);
    if (cartWorker?.id) invalidateAvailability(cartWorker.id);
    if (dropSlot) {
      useBookingDraftStore.getState().setSelectedTimeSlot(null);
      checkoutHold.release();
    }
    // navigate (not replace): returns to the schedule step already in the stack
    router.navigate('/booking/schedule' as any);
  };

  const onIssuePrimary = () => {
    if (!issue) return;
    if (issue.kind === 'retryable') {
      setIssue(null);
      // same details -> same attempt reference; the server returns a booking that did go through
      handleConfirmBooking();
    } else if (issue.kind === 'worker_unavailable') {
      setIssue(null);
      checkoutHold.release();
      router.navigate('/(tabs)/explore' as any);
    } else {
      backToSchedule(true);
    }
  };

  const onIssueSecondary = () => {
    if (!issue) return;
    if (issue.kind === 'slot_taken' || issue.kind === 'time_unavailable') {
      // Keep the selection: the schedule screen re-fetches and drops it only if it really is unavailable.
      backToSchedule(false);
    } else {
      setIssue(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />
      {/* Android resizes the window itself (softwareKeyboardLayoutMode: 'resize'); iOS needs the padding. */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Screen Header */}
        <ScheduleHeader
          title="Review & confirm"
        />

        {/* Funnel Step Progress Primitive (Step 4 of 4: Review) */}
        <StepProgress currentStep={4} />

        {/* Scrollable Content with Fixed Serial Position Order */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* 1. Worker Identity Row */}
          <SummaryWorkerRow worker={cartWorker} />

          {/* 2. Services Requested Row */}
          <SummaryServicesList items={cartItems} />

          {/* 3. Schedule & Arrival Row */}
          <SummaryScheduleRow
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
          />

          {/* 4. Delivery Address Row */}
          <SummaryAddressRow address={address} />

          {/* 5. Collapsed Special Instructions Note */}
          <DescriptionInput value={note} onChangeText={setNote} />

          {/* The one in-content divider: booking details above, payment below. */}
          <View style={styles.groupDivider} />

          {/* 6. Offers: automatic worker offer, usable coupons (Apply), typed code (not offered for custom-quote pricing) */}
          {!isQuotePricing && quoteParams && (
            <View onLayout={(e) => { promoY.current = e.nativeEvent.layout.y; }}>
              <CheckoutOffersSection
                offers={checkout.offers}
                isLoading={checkout.isLoading}
                promo={promo}
                workerName={cartWorker?.name}
                onFocusField={scrollToPromo}
              />
            </View>
          )}

          {/* 7. Pricing Summary Breakdown */}
          <SummarySectionCard title="Price details">
            {checkout.isError && !checkout.offers ? (
              <View style={styles.priceError}>
                <Text style={styles.priceErrorText}>
                  {quoteParams
                    ? "We couldn't load your price. Check your connection and try again."
                    : 'Choose a valid address and time to see your price.'}
                </Text>
                {quoteParams ? (
                  <Pressable onPress={() => checkout.refetch()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retry loading price">
                    <Text style={styles.priceErrorRetry}>Try again</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <BookingPriceSummary
                rows={priceRows}
                total={displayTotal}
                loading={!pricing || checkout.isFetching || promo.isBusy}
                showEscrowNote={false}
              />
            )}
          </SummarySectionCard>

          {/* Bottom Spacer for Sticky Footer (the content gap above it adds 32) */}
          <View style={{ height: 80 + insets.bottom }} />
        </ScrollView>

        {/* Sticky Primary Confirmation Footer CTA */}
        <BookingFooterCTA
          label="Confirm booking"
          caption={priceReady ? 'Total' : undefined}
          subtext={priceReady ? `Rs. ${displayTotal.toLocaleString()}` : 'Calculating price…'}
          enabled={priceReady}
          loading={isLoading || isPaying}
          onPress={handleConfirmBooking}
          accessibilityLabel={`Confirm booking for total Rs. ${displayTotal.toLocaleString()}`}
        />
      </KeyboardAvoidingView>

      {issue ? (
        <BookingIssueSheet
          visible
          kind={issue.kind}
          reason={issue.reason}
          attemptRef={issue.attemptRef}
          primaryLoading={isLoading}
          onPrimary={onIssuePrimary}
          onSecondary={onIssueSecondary}
          onDismiss={() => setIssue(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = ({ palette, colors }: AppTheme) => StyleSheet.create({
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
  // Whitespace separates sections; label→content spacing (8) lives in SummarySectionCard.
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 32,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  priceError: {
    gap: 10,
  },
  priceErrorText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  priceErrorRetry: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.primaryDark,
  },
});
