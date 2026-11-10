import { useEffect, useMemo, useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

// Design system

// Hooks & Stores
import { useCalendarMonth } from '../../src/hooks/useCalendarMonth';
import { useWorkerSlots } from '../../src/hooks/useWorkerSlots';
import { useBookingDraftStore } from '../../src/store/bookingDraft.store';
import { useCartStore } from '../../src/store/cart.store';
import { normalizeDateToYYYYMMDD, parseTimeSlot } from '../../src/utils/timezone';
import { cartDurationHours } from '../../src/utils/bookingDuration';
import { useAuthStore } from '../../src/store/auth.store';
import { checkoutHold } from '../../src/services/booking/checkoutHold';
import { invalidateAvailability } from '../../src/utils/availabilityEvents';

// Components
import { StepProgress } from '../../src/components/booking/StepProgress';
import { BookingFooterCTA } from '../../src/components/booking/BookingFooterCTA';

// Schedule Subcomponents
import { ScheduleHeader } from '../../src/components/booking/schedule/ScheduleHeader';
import { CalendarHeader } from '../../src/components/booking/schedule/CalendarHeader';
import { CalendarWeekdayRow } from '../../src/components/booking/schedule/CalendarWeekdayRow';
import { CalendarGrid } from '../../src/components/booking/schedule/CalendarGrid';
import { TimeSlotGrid } from '../../src/components/booking/schedule/TimeSlotGrid';
import { UrgentToggleRow } from '../../src/components/booking/schedule/UrgentToggleRow';
import { BookingIssueSheet, type BookingIssueKind } from '../../src/components/booking/BookingIssueSheet';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

export default function ScheduleScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Cart store for selected worker and items info
  const cartWorker = useCartStore((s) => s.worker);
  const cartItems = useCartStore((s) => s.items);

  // Derive service duration dynamically from cart (defaults to 0.5 hours / 30 mins)
  // The SAME duration checkout sends (shared helper), so the slots shown are validated for the same interval.
  const serviceDurationHours = useMemo(() => cartDurationHours(cartItems), [cartItems]);
  const token = useAuthStore((s) => s.accessToken);

  // Booking draft store
  const {
    selectedDate,
    selectedTimeSlot,
    isUrgent,
    setSelectedTimeSlot,
    setIsUrgent,
    setWorkerId,
    hydrate,
    // Read the persisted workerId directly from the draft store so both hooks
    // share a single stable reference — avoids a double cart-subscription that
    // was causing duplicate /availability/month and /slots requests.
    workerId: draftWorkerId,
  } = useBookingDraftStore();

  // Hydrate store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Sync worker ID from cart into the draft store whenever the cart changes.
  // Only update when the cart has a real UUID to avoid writing null over a
  // previously persisted (and valid) workerId.
  useEffect(() => {
    if (cartWorker?.id && cartWorker.id !== 'default') {
      // A different worker has a different calendar: drop a slot picked for the previous worker.
      if (draftWorkerId && draftWorkerId !== cartWorker.id) {
        setSelectedTimeSlot(null);
      }
      setWorkerId(cartWorker.id);
    }
  }, [cartWorker, draftWorkerId, setWorkerId, setSelectedTimeSlot]);

  // Derive a single stable workerId for both availability hooks.
  // Prefer the draft store's persisted value (survives navigation) over the
  // live cart value to avoid an unnecessary extra render/fetch cycle.
  const resolvedWorkerId = cartWorker?.id && cartWorker.id !== 'default' ? cartWorker.id : (draftWorkerId || null);

  const normalizedSelectedDate = normalizeDateToYYYYMMDD(selectedDate);

  // Calendar month state hook
  const {
    monthLabel,
    daysArray,
    slideDirection,
    visibleMonth,
    visibleYear,
    canGoPrev,
    nextMonth,
    prevMonth,
    selectDate,
  } = useCalendarMonth(normalizedSelectedDate || undefined, resolvedWorkerId);

  // Time slots hook with dynamic duration & race-condition cancellation
  const { slots, isLoading, isError: isSlotsError, refetch: refetchSlots } = useWorkerSlots(
    normalizedSelectedDate,
    resolvedWorkerId,
    serviceDurationHours
  );

  // Refetch slots on screen focus (e.g. after navigating back from payment or other screens)
  useFocusEffect(
    useCallback(() => {
      refetchSlots();
    }, [refetchSlots])
  );

  // Invalidate selectedTimeSlot if it is occupied / unavailable in newly fetched slots
  useEffect(() => {
    if (selectedTimeSlot && slots.length > 0) {
      const matching = slots.find((s) => s.timeStr === selectedTimeSlot);
      if (matching && !matching.available) {
        setSelectedTimeSlot(null);
      }
    }
  }, [slots, selectedTimeSlot, setSelectedTimeSlot]);

  // Determine whether the currently selected slot is genuinely available
  const isSelectedSlotAvailable = Boolean(
    selectedDate &&
      selectedTimeSlot &&
      slots.some((s) => s.timeStr === selectedTimeSlot && s.available)
  );

  // Navigation action
  // Continue = the customer commits to this slot: take a short server-side checkout hold so nobody else
  // can book it while they enter address / review. Browsing slots never holds anything.
  const [isHolding, setIsHolding] = useState(false);
  const [holdIssue, setHoldIssue] = useState<{ kind: BookingIssueKind; reason: string | null } | null>(null);

  const handleContinue = async () => {
    if (isHolding) return;
    const date = normalizeDateToYYYYMMDD(selectedDate);
    // Guests cannot hold (auth required); booking create still validates atomically after sign-in.
    if (token && resolvedWorkerId && date && selectedTimeSlot) {
      const { hour24, minute } = parseTimeSlot(selectedTimeSlot);
      const startTime = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      setIsHolding(true);
      const res = await checkoutHold.acquire({
        workerId: resolvedWorkerId, date, startTime, durationHours: serviceDurationHours,
      });
      setIsHolding(false);
      if (!res.ok) {
        invalidateAvailability(resolvedWorkerId); // the calendar must stop offering it
        if (res.failure.kind !== 'retryable' && res.failure.kind !== 'other') {
          setHoldIssue({ kind: res.failure.kind, reason: res.failure.reason });
        }
        return;
      }
    }
    // Navigate to next funnel step (Day 23 Address Screen)
    router.push('/booking/address' as any);
  };

  const onHoldIssuePrimary = () => {
    const kind = holdIssue?.kind;
    setHoldIssue(null);
    if (kind === 'worker_unavailable') {
      router.navigate('/(tabs)/explore' as any);
      return;
    }
    setSelectedTimeSlot(null); // pick another time right here
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedStatusBar />
      <View style={styles.container}>
        {/* Screen Header */}
        <ScheduleHeader />

        {/* Funnel Step Progress Primitive (Step 2 of 4: Schedule) */}
        <StepProgress currentStep={2} />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar Section */}
          <View style={styles.calendarCard}>
            <CalendarHeader
              monthLabel={monthLabel}
              canGoPrev={canGoPrev}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
            />

            <CalendarWeekdayRow />

            <CalendarGrid
              daysArray={daysArray}
              selectedDate={normalizedSelectedDate}
              slideDirection={slideDirection}
              visibleMonth={visibleMonth}
              visibleYear={visibleYear}
              onSelectDate={(d) => selectDate(normalizeDateToYYYYMMDD(d) || d)}
            />
          </View>

          {/* Time Slot Grid Section (only rendered when date is selected) */}
          {normalizedSelectedDate && (
            <TimeSlotGrid
              slots={slots}
              isLoading={isLoading}
              isError={isSlotsError}
              onRetry={refetchSlots}
              selectedTimeSlot={selectedTimeSlot}
              onSelectSlot={setSelectedTimeSlot}
            />
          )}

          {/* Urgent Booking Switch Row */}
          <UrgentToggleRow isUrgent={isUrgent} onToggle={setIsUrgent} />

          {/* Bottom spacing to ensure scroll clears sticky footer */}
          <View style={{ height: 112 + insets.bottom }} />
        </ScrollView>

        {/* Sticky Continue Footer */}
        <BookingFooterCTA
          label="Next: Address →"
          subtext={
            selectedDate && selectedTimeSlot
              ? `${selectedDate} • ${selectedTimeSlot}`
              : 'Select date & time slot'
          }
          enabled={isSelectedSlotAvailable && !isHolding}
          loading={isHolding}
          onPress={handleContinue}
        />
      </View>

      {holdIssue ? (
        <BookingIssueSheet
          visible
          kind={holdIssue.kind}
          reason={holdIssue.reason}
          onPrimary={onHoldIssuePrimary}
          onSecondary={() => { setHoldIssue(null); refetchSlots(); }}
          onDismiss={() => setHoldIssue(null)}
        />
      ) : null}
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
    paddingTop: 8,
    paddingBottom: 20,
  },
  calendarCard: {
    backgroundColor: colors.bgCard,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    paddingBottom: 14,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  footerSpacer: {
    height: 120,
  },
});
