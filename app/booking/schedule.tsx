import { useEffect } from 'react';
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Design system
import { palette, colors } from '../../src/design';

// Hooks & Stores
import { useCalendarMonth } from '../../src/hooks/useCalendarMonth';
import { useWorkerSlots } from '../../src/hooks/useWorkerSlots';
import { useBookingDraftStore } from '../../src/store/bookingDraft.store';
import { useCartStore } from '../../src/store/cart.store';

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

  // Cart store for selected worker info if available
  const cartWorker = useCartStore((s) => s.worker);

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
      setWorkerId(cartWorker.id);
    }
  }, [cartWorker, setWorkerId]);

  // Derive a single stable workerId for both availability hooks.
  // Prefer the draft store's persisted value (survives navigation) over the
  // live cart value to avoid an unnecessary extra render/fetch cycle.
  const resolvedWorkerId = draftWorkerId || cartWorker?.id || null;

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
  } = useCalendarMonth(selectedDate || undefined, resolvedWorkerId);

  // Time slots hook (re-queries automatically whenever selectedDate or workerId changes)
  const { slots, isLoading, isError: isSlotsError, refetch: refetchSlots } = useWorkerSlots(
    selectedDate,
    resolvedWorkerId,
    2
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
              selectedDate={selectedDate}
              slideDirection={slideDirection}
              visibleMonth={visibleMonth}
              visibleYear={visibleYear}
              onSelectDate={selectDate}
            />
          </View>

          {/* Time Slot Grid Section (only rendered when date is selected) */}
          {selectedDate && (
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
          <View style={styles.footerSpacer} />
        </ScrollView>

        {/* Sticky Continue Footer */}
        <BookingFooterCTA
          label="Next: Address →"
          subtext={
            selectedDate && selectedTimeSlot
              ? `${selectedDate} • ${selectedTimeSlot}`
              : 'Select date & time slot'
          }
          enabled={Boolean(selectedDate && selectedTimeSlot)}
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
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: palette.gray200,
    overflow: 'hidden',
    shadowColor: palette.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  footerSpacer: {
    height: 120,
  },
});
