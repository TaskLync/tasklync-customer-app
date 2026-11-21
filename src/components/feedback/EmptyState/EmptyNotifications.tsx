import React from 'react';
import { EmptyState } from './EmptyState';

export interface EmptyNotificationsProps {
  isFiltered?: boolean;
}

export const EmptyNotifications: React.FC<EmptyNotificationsProps> = ({ isFiltered = false }) => (
  <EmptyState
    type="no-data"
    title={isFiltered ? 'No unread notifications' : "You're all caught up"}
    description={
      isFiltered
        ? "You're up to date."
        : 'No notifications yet. Updates about your bookings will appear here.'
    }
  />
);
