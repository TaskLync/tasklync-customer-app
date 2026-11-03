import React from 'react';
import { EmptyState } from './EmptyState';

export function EmptyBookingsCancelled() {
  return (
    <EmptyState
      type="no-data"
      title="No cancelled bookings"
      description="Bookings that were cancelled or rejected will be listed here."
    />
  );
}
