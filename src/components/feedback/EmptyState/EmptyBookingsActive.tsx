import React from 'react';
import { useRouter } from 'expo-router';
import { EmptyState } from './EmptyState';

export function EmptyBookingsActive() {
  const router = useRouter();

  return (
    <EmptyState
      type="no-data"
      title="No active bookings"
      description="You don't have any upcoming or ongoing services right now."
      actionLabel="Browse Services"
      onAction={() => router.push('/(tabs)' as any)}
    />
  );
}
