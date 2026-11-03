import React from 'react';
import { EmptyState } from './EmptyState';

export interface EmptyNotificationsProps {
  isFiltered?: boolean;
}

export const EmptyNotifications: React.FC<EmptyNotificationsProps> = ({
  isFiltered = false,
}) => {
  return (
    <EmptyState
      type="no-data"
      title={isFiltered ? 'No unread notifications' : "You're all caught up! 🎉"}
      description={
        isFiltered
          ? 'You have reviewed all your updates. Switch back to "All" to view previous notifications.'
          : 'When you get updates on your bookings, direct messages, or exclusive offers, they will appear here in real-time.'
      }
    />
  );
};
