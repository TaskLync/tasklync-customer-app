import React, { FC } from 'react';
import { useRouter } from 'expo-router';
import { EmptyState } from './EmptyState';

interface EmptyCartProps {
  onBrowseServices?: () => void;
}

export const EmptyCart: FC<EmptyCartProps> = ({ onBrowseServices }) => {
  const router = useRouter();

  const handleBrowse = () => {
    if (onBrowseServices) {
      onBrowseServices();
    } else {
      router.push('/(tabs)/explore' as any);
    }
  };

  return (
    <EmptyState
      type="no-data"
      title="Your cart is empty"
      description="Explore top-rated local workers and add services to get started."
      actionLabel="Browse Services"
      onAction={handleBrowse}
    />
  );
};
