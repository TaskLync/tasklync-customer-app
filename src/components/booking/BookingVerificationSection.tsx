import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { BookingStatus } from '../../types/booking.types';
import { isVerificationEligible } from '../../utils/verificationState.util';
import { BookingVerificationCard } from './BookingVerificationCard';
import { BookingQRCodeSheet } from './BookingQRCodeSheet';

interface BookingVerificationSectionProps {
  bookingId: string;
  status: BookingStatus | string;
}

/**
 * Top-level Customer Booking Verification Section.
 * Encapsulates the OTP card and QR Code sheet with contextual lifecycle gating.
 * Strictly renders only when the booking is in an eligible start state (ACCEPTED).
 */
export const BookingVerificationSection: React.FC<BookingVerificationSectionProps> = ({
  bookingId,
  status,
}) => {
  const [isQrSheetVisible, setIsQrSheetVisible] = useState(false);
  const eligible = isVerificationEligible(status);

  // If the booking is not eligible (e.g. PENDING, IN_PROGRESS, COMPLETED, CANCELLED), do not mount
  if (!eligible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BookingVerificationCard
        bookingId={bookingId}
        isEligible={eligible}
        onOpenQr={() => setIsQrSheetVisible(true)}
      />

      <BookingQRCodeSheet
        bookingId={bookingId}
        visible={isQrSheetVisible}
        isEligible={eligible}
        onClose={() => setIsQrSheetVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
