import { useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

// Design system
import { palette, colors } from '../../src/design';

// Hooks & Stores
import { useCalendarMonth } from '../../src/hooks/useCalendarMonth';
import { useWorkerSlots } from '../../src/hooks/useWorkerSlots';
import { useBookingDraftStore } from '../../src/store/bookingDraft.store';
import { useCartStore } from '../../src/store/cart.store';
import { normalizeDateToYYYYMMDD } from '../../src/utils/timezone';

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

export default function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Cart store for selected worker and items info
  const cartWorker = useCartStore((s) => s.worker);
  const cartItems = useCartStore((s) => s.items);

  // Derive service duration dynamically from cart (defaults to 0.5 hours / 30 mins)
  const serviceDurationHours = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return 0.5;
    const total = cartItems.reduce((acc, item) => {
      const itemHours = item.durationHours || (item.durationMins ? item.durationMins / 60 : 0.5);
      return acc + itemHours * (item.quantity || 1);
    }, 0);
    return Math.max(0.5, Math.min(12, total));
  }, [cartItems]);

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
  const handleContinue = () => {
    // Navigate to next funnel step (Day 23 Address Screen)
    router.push('/booking/address' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.white} />
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
          enabled={isSelectedSlotAvailable}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
