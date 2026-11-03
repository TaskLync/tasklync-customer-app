import { BookingStatus } from '../types/booking.types';
import { colors, palette } from '../design/colors';

/**
 * Single source of truth for booking status styling & labels
 */

export function statusToColor(status?: BookingStatus | string): string {
  switch (status) {
    case 'PENDING':
      return colors.warning; // Amber
    case 'ACCEPTED':
      return colors.info; // Blue
    case 'IN_PROGRESS':
    case 'COMPLETED_BY_WORKER':
    case 'RESOLVED':
      return colors.primaryDark; // Green
    case 'COMPLETED':
    case 'AUTO_COMPLETED':
      return colors.textSecondary; // Slate Gray
    case 'CANCELLED':
    case 'REJECTED':
      return colors.danger; // Red
    case 'DISPUTED':
      return colors.dangerMedium; // Deep Red
    case 'REFUNDED':
      return palette.sky600; // Sky Blue
    default:
      return colors.textMuted; // Neutral Slate
  }
}

export function statusToBgColor(status?: BookingStatus | string): string {
  switch (status) {
    case 'PENDING':
      return colors.warningLight; // Amber 100
    case 'ACCEPTED':
      return palette.blue100; // Blue 100
    case 'IN_PROGRESS':
    case 'COMPLETED_BY_WORKER':
    case 'RESOLVED':
      return palette.green100; // Green 100
    case 'COMPLETED':
    case 'AUTO_COMPLETED':
      return colors.bgHover; // Slate 100
    case 'CANCELLED':
    case 'REJECTED':
      return palette.red100; // Red 100
    case 'DISPUTED':
      return palette.red100; // Red 100
    case 'REFUNDED':
      return palette.sky100; // Sky 100
    default:
      return colors.bgHover;
  }
}

export function statusToTextColor(status?: BookingStatus | string): string {
  switch (status) {
    case 'PENDING':
      return colors.textWarning;
    case 'ACCEPTED':
      return colors.textInfoDark;
    case 'IN_PROGRESS':
    case 'COMPLETED_BY_WORKER':
    case 'RESOLVED':
      return colors.textGreenDark;
    case 'COMPLETED':
    case 'AUTO_COMPLETED':
      return colors.textSecondary;
    case 'CANCELLED':
    case 'REJECTED':
    case 'DISPUTED':
      return colors.textDangerDark;
    case 'REFUNDED':
      return palette.sky700;
    default:
      return colors.textPrimary;
  }
}

export function statusToLabel(status?: BookingStatus | string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'ACCEPTED':
      return 'Confirmed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED_BY_WORKER':
      return 'Awaiting Confirmation';
    case 'COMPLETED':
    case 'AUTO_COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REJECTED':
      return 'Declined';
    case 'DISPUTED':
      return 'Disputed';
    case 'RESOLVED':
      return 'Resolved';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status ? String(status).replace(/_/g, ' ') : 'Unknown';
  }
}
