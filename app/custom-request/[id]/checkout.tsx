import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Banknote,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Check,
} from 'lucide-react-native';

import { typography } from '../../../src/design';
import { useCustomRequestDetail } from '../../../src/hooks/custom-requests/useCustomRequestDetail';
import { useQuoteDetail } from '../../../src/hooks/custom-requests/useQuoteDetail';
import { useQuoteCheckout } from '../../../src/hooks/custom-requests/useQuoteCheckout';
import { useCalendarMonth } from '../../../src/hooks/useCalendarMonth';
import { useWorkerSlots } from '../../../src/hooks/useWorkerSlots';
import { CalendarHeader } from '../../../src/components/booking/schedule/CalendarHeader';
import { CalendarWeekdayRow } from '../../../src/components/booking/schedule/CalendarWeekdayRow';
import { CalendarGrid } from '../../../src/components/booking/schedule/CalendarGrid';
import { TimeSlotGrid } from '../../../src/components/booking/schedule/TimeSlotGrid';
import { AddAddressBottomSheet, AddAddressBottomSheetRef } from '../../../src/components/address/AddAddressBottomSheet';
import { normalizeDateToYYYYMMDD } from '../../../src/utils/timezone';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../src/theme/useAppTheme';
import { showAlert } from '../../../src/components/feedback/AppAlert';

export default function QuoteCheckoutScreen() {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = id || '';

  const addAddressSheetRef = useRef<AddAddressBottomSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const { request, isLoading: isRequestLoading } = useCustomRequestDetail(requestId);
  const { activeQuote, isLoading: isQuoteLoading } = useQuoteDetail(requestId);

  const checkout = useQuoteCheckout({
    request: request || ({} as any),
    quote: activeQuote || ({} as any),
  });

  const workerId = request?.worker_id || activeQuote?.worker_id || null;
  const durationHours = activeQuote?.estimated_duration_hours || 2;

  const handlePressConfirm = () => {
    if (checkout.isSubmitting) return;

    if (!checkout.selectedDate) {
      checkout.setValidationError('Please select an appointment date from the calendar.');
      showAlert('Date Required', 'Please select an appointment date from the calendar.');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (!checkout.selectedSlot) {
      checkout.setValidationError('Please choose an arrival time slot above.');
      showAlert('Time Slot Required', 'Please choose an available arrival time slot above.');
      return;
    }

    if (!checkout.selectedAddress) {
      checkout.setValidationError('Please select or add a service delivery address.');
      showAlert('Address Required', 'Please select or add a service delivery address.');
      addAddressSheetRef.current?.open();
      return;
    }

    checkout.confirmBooking();
  };

  const normalizedSelectedDate = normalizeDateToYYYYMMDD(checkout.selectedDate);

  // Calendar month state
  const {
    monthLabel,
    daysArray,
    visibleMonth,
    visibleYear,
    slideDirection,
    canGoPrev,
    nextMonth,
    prevMonth,
    selectDate,
  } = useCalendarMonth(normalizedSelectedDate || undefined, workerId);

  // Time slots for selected date
  const {
    slots,
    isLoading: isSlotsLoading,
    isError: isSlotsError,
    refetch: refetchSlots,
  } = useWorkerSlots(normalizedSelectedDate, workerId, durationHours);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/custom-request/${requestId}/quote` as any);
    }
  };

  const isLoading = isRequestLoading || isQuoteLoading;

  if (isLoading && (!request || !activeQuote)) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={palette.green600} />
        <Text style={styles.loadingText}>Loading checkout details...</Text>
      </SafeAreaView>
    );
  }

  if (!request || !activeQuote) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <AlertTriangle size={48} color={palette.red500} />
        <Text style={styles.errorTitle}>Quote Not Available</Text>
        <Text style={styles.errorSubtitle}>
          This quote could not be loaded or is no longer valid for checkout.
        </Text>
        <TouchableOpacity style={styles.backLink} onPress={handleBack}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isReadyToConfirm = Boolean(
    checkout.selectedDate &&
      checkout.selectedSlot &&
      checkout.selectedAddress &&
      !checkout.isSubmitting
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={22} color={palette.gray900} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Confirm Appointment</Text>
          <Text style={styles.headerSubtitle}>Cash on Delivery Checkout</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Schedule Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <CalendarIcon size={18} color={palette.green600} />
            <Text style={styles.sectionHeaderTitle}>Select Date & Arrival Window</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Choose an arrival slot for {request.provider_name || request.worker_name || 'your professional'}.
          </Text>

          <CalendarHeader
            monthLabel={monthLabel}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            canGoPrev={canGoPrev}
          />

          <CalendarWeekdayRow />

          <CalendarGrid
            daysArray={daysArray}
            selectedDate={normalizedSelectedDate}
            onSelectDate={(dateStr) => {
              const norm = normalizeDateToYYYYMMDD(dateStr) || dateStr;
              checkout.setSelectedDate(norm);
              checkout.setSelectedSlot(null);
              selectDate(norm);
            }}
            slideDirection={slideDirection}
            visibleMonth={visibleMonth}
            visibleYear={visibleYear}
          />

          {checkout.selectedDate ? (
            <View style={{ marginTop: 16 }}>
              <TimeSlotGrid
                slots={slots}
                isLoading={isSlotsLoading}
                isError={isSlotsError}
                selectedTimeSlot={checkout.selectedSlot}
                onSelectSlot={(slotStr) => checkout.setSelectedSlot(slotStr)}
                onRetry={refetchSlots}
              />
            </View>
          ) : null}
        </View>

        {/* Step 2: Service Location */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MapPin size={18} color={palette.green600} />
            <Text style={styles.sectionHeaderTitle}>Service Address</Text>
            <TouchableOpacity
              style={styles.changeLink}
              onPress={() => addAddressSheetRef.current?.open()}
            >
              <Text style={styles.changeLinkText}>Change</Text>
            </TouchableOpacity>
          </View>

          {checkout.selectedAddress ? (
            <View style={styles.addressBox}>
              <View style={styles.addressIconWrap}>
                <MapPin size={18} color={palette.green600} />
              </View>
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressLabel}>{checkout.selectedAddress.label || 'Home'}</Text>
                <Text style={styles.addressStreet} numberOfLines={2}>
                  {checkout.selectedAddress.street}
                  {checkout.selectedAddress.city ? `, ${checkout.selectedAddress.city}` : ''}
                </Text>
              </View>
              <Check size={18} color={palette.green600} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyAddressBox}
              onPress={() => addAddressSheetRef.current?.open()}
            >
              <Text style={styles.emptyAddressText}>+ Select delivery address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step 3: Payment Method (Locked to Cash on Delivery) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Banknote size={18} color={palette.green600} />
            <Text style={styles.sectionHeaderTitle}>Payment Method</Text>
          </View>

          <View style={styles.paymentMethodBox}>
            <View style={styles.codIconWrap}>
              <Banknote size={22} color={colors.textGreen} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.codTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.codSubtitle}>
                Pay PKR {activeQuote.total_price.toLocaleString()} cash directly to your technician after the job is completed.
              </Text>
            </View>
            <View style={styles.checkedCircle}>
              <Check size={14} color={colors.pureWhite} />
            </View>
          </View>
        </View>

        {/* Step 4: Summary Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Work & Labor</Text>
            <Text style={styles.summaryValue}>PKR {Number(activeQuote.work_price).toLocaleString()}</Text>
          </View>

          {Number(activeQuote.inspection_fee) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Inspection Fee</Text>
              <Text style={styles.summaryValue}>
                PKR {Number(activeQuote.inspection_fee).toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Fee (5%)</Text>
            <Text style={styles.summaryValue}>
              PKR {Number(activeQuote.customer_platform_fee).toLocaleString()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>PKR {activeQuote.total_price.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
        ]}
      >
        <TouchableOpacity
          style={[styles.confirmBtn, !isReadyToConfirm && styles.confirmBtnDisabled]}
          onPress={() => checkout.confirmBooking()}
          disabled={!isReadyToConfirm}
          activeOpacity={0.8}
        >
          {checkout.isSubmitting ? (
            <ActivityIndicator size="small" color={colors.pureWhite} />
          ) : (
            <Text style={styles.confirmBtnText}>
              Confirm & Book with COD • PKR {activeQuote.total_price.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add / Change Address Bottom Sheet */}
      <AddAddressBottomSheet
        ref={addAddressSheetRef}
        onAddressCreated={(newAddr) => {
          checkout.setSelectedAddress({
            id: newAddr.id,
            user_id: '',
            label: newAddr.label,
            street: newAddr.street,
            city: newAddr.city,
            latitude: newAddr.latitude,
            longitude: newAddr.longitude,
            is_default: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvasGray,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: palette.canvasGray,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: palette.gray600,
  },
  errorTitle: {
    marginTop: 16,
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: palette.gray900,
  },
  errorSubtitle: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray500,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 16,
    padding: 8,
  },
  backLinkText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.green600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: palette.gray900,
  },
  headerSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeaderTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: palette.gray900,
    marginLeft: 8,
    flex: 1,
  },
  sectionSubtext: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
    marginBottom: 14,
  },
  changeLink: {
    padding: 4,
  },
  changeLinkText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.green600,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.bgSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBorderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addressTextWrap: {
    flex: 1,
  },
  addressLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.gray900,
  },
  addressStreet: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray600,
    marginTop: 1,
  },
  emptyAddressBox: {
    padding: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  emptyAddressText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.green600,
  },
  paymentMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.primaryTint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginTop: 6,
  },
  codIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBorderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.textGreen,
  },
  codSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: colors.textGreenDark,
    marginTop: 2,
    lineHeight: 16,
  },
  checkedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.green600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: palette.gray900,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray600,
  },
  summaryValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: palette.gray900,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
    color: palette.gray900,
  },
  totalValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: palette.green600,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirmBtn: {
    backgroundColor: palette.green600,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.pureWhite,
  },
});
