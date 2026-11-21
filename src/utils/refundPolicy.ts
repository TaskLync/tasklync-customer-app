import type { BookingDetails, RefundPolicyResult } from '../types/booking.types';
import type { CancellationTerms } from './feeDisplay';

/**
 * Pure function: the refund the customer can expect if they cancel now. A preview only: booking-service
 * decides the real refund with the same rules.
 *
 * The cancellation fee percentages are NOT fixed in the app. They come from the admin's Pricing & Commission
 * settings (GET /bookings/pricing-config → `terms`). When the fee is 0 the customer sees a full refund.
 *
 * 1. PENDING (worker has not accepted): always a full refund.
 * 2. ACCEPTED: full refund minus the configured fee for the timing (more than 24h / 24h or less / worker on site).
 * 3. IN_PROGRESS / COMPLETED: no standard refund (report a problem instead).
 * 4. CANCELLED / REFUNDED: already closed.
 *
 * Returns null while the fee settings are not known yet (never guesses a fee).
 */
export function computeRefundPolicy(
  booking?: Partial<BookingDetails> | null,
  terms?: CancellationTerms | null,
  referenceNow: Date = new Date()
): RefundPolicyResult | null {
  const totalAmount = Number(booking?.estimated_total || booking?.base_price || 0);
  const full = (reason: string): RefundPolicyResult => ({
    percentage: 100,
    label: 'Full refund (100%)',
    headline: "You'll get a full refund",
    reason,
    eligibleForRefund: true,
    isDisputeOnly: false,
    estimatedRefundAmount: totalAmount,
  });

  if (!booking) return full('There is no cancellation fee.');

  const status = (booking.status || 'PENDING').toUpperCase();

  // 1. Before worker accepts
  if (status === 'PENDING') {
    return full('The worker has not accepted this booking yet, so there is no cancellation fee.');
  }

  // 2. Active ongoing or completed work (Dispute-only)
  if (
    status === 'IN_PROGRESS' ||
    status === 'COMPLETED' ||
    status === 'COMPLETED_BY_WORKER' ||
    status === 'AUTO_COMPLETED' ||
    status === 'DISPUTED'
  ) {
    return {
      percentage: 0,
      label: 'No standard refund (0%)',
      headline: 'Job is active or completed',
      reason: 'You cannot cancel after the job has started. If the work was poor, unfinished or you were overcharged, please report a problem.',
      eligibleForRefund: false,
      isDisputeOnly: true,
      estimatedRefundAmount: 0,
    };
  }

  // 3. Already cancelled / refunded
  if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'REJECTED') {
    return {
      percentage: 0,
      label: 'Booking closed',
      headline: 'Booking is already cancelled or closed',
      reason: 'No further cancellation actions can be applied to this booking.',
      eligibleForRefund: false,
      isDisputeOnly: false,
      estimatedRefundAmount: 0,
    };
  }

  // 4. ACCEPTED: the fee depends on timing and on the admin's settings.
  if (!terms) return null;

  let feePercent: number;
  let when: string;
  const arrivedAt = (booking as { arrived_at?: string | null }).arrived_at;
  const scheduledMs = booking.scheduled_at ? new Date(booking.scheduled_at).getTime() : NaN;
  const diffHours = (scheduledMs - referenceNow.getTime()) / (1000 * 60 * 60);

  if (arrivedAt) {
    feePercent = terms.afterArrivalPercent;
    when = 'The worker has already reached your address.';
  } else if (!Number.isFinite(diffHours) || diffHours > 24) {
    feePercent = terms.over24hPercent;
    when = 'You are cancelling more than 24 hours before the booking time.';
  } else {
    feePercent = terms.within24hPercent;
    when = 'You are cancelling less than 24 hours before the booking time.';
  }

  if (feePercent <= 0) return full('There is no cancellation fee.');

  const refundPercent = Math.round((100 - feePercent) * 100) / 100;
  return {
    percentage: refundPercent,
    label: `${refundPercent}% refund`,
    headline: `You'll get a ${refundPercent}% refund`,
    reason: `${when} A ${feePercent}% cancellation fee applies.`,
    eligibleForRefund: refundPercent > 0,
    isDisputeOnly: false,
    estimatedRefundAmount: Math.round((totalAmount * refundPercent) / 100),
  };
}
