import { BookingStatus } from '../types/booking.types';

export interface BookingActionConfig {
  label: string;
  action: 'cancel' | 'message' | 'track' | 'confirm' | 'dispute' | 'review' | 'book_again';
  variant: 'primary' | 'secondary' | 'danger' | 'outline';
}

export const bookingActionsMap: Record<BookingStatus, BookingActionConfig[]> = {
  PENDING: [
    { label: 'Message', action: 'message', variant: 'secondary' },
    { label: 'Cancel', action: 'cancel', variant: 'danger' }
  ],
  ACCEPTED: [
    { label: 'Message', action: 'message', variant: 'secondary' },
    { label: 'Cancel', action: 'cancel', variant: 'danger' }
  ],
  REJECTED: [],
  IN_PROGRESS: [
    { label: 'Track', action: 'track', variant: 'primary' },
    { label: 'Message', action: 'message', variant: 'secondary' }
  ],
  COMPLETED_BY_WORKER: [
    { label: 'Confirm', action: 'confirm', variant: 'primary' },
    { label: 'Dispute', action: 'dispute', variant: 'danger' }
  ],
  COMPLETED: [
    { label: 'Review', action: 'review', variant: 'primary' },
    { label: 'Book again', action: 'book_again', variant: 'secondary' }
  ],
  AUTO_COMPLETED: [
    { label: 'Review', action: 'review', variant: 'primary' },
    { label: 'Book again', action: 'book_again', variant: 'secondary' }
  ],
  DISPUTED: [],
  RESOLVED: [],
  REFUNDED: [],
  CANCELLED: [
    { label: 'Book again', action: 'book_again', variant: 'secondary' }
  ],
};
