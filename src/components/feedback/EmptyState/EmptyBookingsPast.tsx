import React from 'react';
import { useRouter } from 'expo-router';
import { EmptyState } from './EmptyState';

export function EmptyBookingsPast() {
  const router = useRouter();

  return (
    <EmptyState
      type="no-data"
      title="No past bookings yet"
      description="Your completed services will appear here for easy reference and re-booking."
      actionLabel="Explore Services"
      onAction={() => router.push('/(tabs)/explore' as any)}
    />
  );
}
