import { BookingStatus } from '../types/booking.types';
import type { AppTheme } from '../theme/useAppTheme';
import {
  CheckCircleIcon,
  ClockIcon,
  CloseCircleIcon,
  PlayCircleIcon,
  WarningIcon,
} from '../components/ui/Icon/icons';

export interface BookingStatusConfig {
  color: string;
  bg: string;
  text: string;
  icon: React.ElementType;
  label: string;
}

/** Status chip styling, resolved against the active theme: `const map = useThemedStyles(createBookingStatusMap)`. */
export const createBookingStatusMap = ({ colors, palette }: AppTheme): Record<BookingStatus, BookingStatusConfig> => ({
  PENDING: {
    color: palette.amber500,
    bg: palette.amber50,
    text: palette.amber800,
    icon: ClockIcon,
    label: 'Pending',
  },
  ACCEPTED: {
    color: palette.blue500,
    bg: palette.blue50,
    text: palette.blue800,
    icon: CheckCircleIcon,
    label: 'Confirmed',
  },
  REJECTED: {
    color: palette.red500,
    bg: palette.red50,
    text: palette.red800,
    icon: CloseCircleIcon,
    label: 'Declined',
  },
  IN_PROGRESS: {
    color: colors.primary,
    bg: colors.primaryTint,
    text: colors.textGreenDark,
    icon: PlayCircleIcon,
    label: 'In progress',
  },
  COMPLETED_BY_WORKER: {
    color: colors.primary,
    bg: colors.primaryTint,
    text: colors.textGreenDark,
    icon: CheckCircleIcon,
    label: 'Waiting for confirmation',
  },
  COMPLETED: {
    color: colors.primaryDark,
    bg: colors.primaryTint,
    text: colors.textGreen,
    icon: CheckCircleIcon,
    label: 'Completed',
  },
  AUTO_COMPLETED: {
    color: colors.primaryDark,
    bg: colors.primaryTint,
    text: colors.textGreen,
    icon: CheckCircleIcon,
    label: 'Completed',
  },
  DISPUTED: {
    color: palette.red600,
    bg: palette.red50,
    text: palette.red800,
    icon: WarningIcon,
    label: 'Disputed',
  },
  RESOLVED: {
    color: colors.primaryDark,
    bg: colors.primaryTint,
    text: colors.textGreen,
    icon: CheckCircleIcon,
    label: 'Resolved',
  },
  REFUNDED: {
    color: palette.gray500,
    bg: palette.gray100,
    text: palette.gray700,
    icon: CheckCircleIcon,
    label: 'Refunded',
  },
  CANCELLED: {
    color: palette.red500,
    bg: palette.red50,
    text: palette.red800,
    icon: CloseCircleIcon,
    label: 'Cancelled',
  },
});
