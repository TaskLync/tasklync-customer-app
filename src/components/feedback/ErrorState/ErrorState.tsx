import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { EmptyState, EmptyStateType } from '../EmptyState/EmptyState';

export interface ErrorStateProps {
  type?: 'offline' | 'error' | 'notFound' | undefined;
  title?: string | undefined;
  subtitle?: string | undefined;
  onRetry?: (() => void) | undefined;
  retryButtonText?: string | undefined;
  isRetrying?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
}

/**
 * ErrorState Component
 *
 * Backed by the official Tasklink 3D Error & Empty State design system:
 * - Automatically renders 3D `no-internet.png` for offline states
 * - Automatically renders 3D `internal-server.png` for server errors
 * - Automatically renders 3D `Empty-screen.png` for notFound states
 * - Preserves accessible retry button with loading state
 */
export const ErrorState: React.FC<ErrorStateProps> = React.memo(({
  type = 'offline',
  title,
  subtitle,
  onRetry,
  retryButtonText = 'Try Again',
  isRetrying = false,
  style,
}) => {
  const mappedType: EmptyStateType =
    type === 'offline'
      ? 'no-internet'
      : type === 'notFound'
      ? 'no-data'
      : 'server-error';

  return (
    <EmptyState
      type={mappedType}
      title={title}
      description={subtitle}
      onAction={onRetry}
      actionLabel={retryButtonText}
      loading={isRetrying}
      style={style}
    />
  );
});

ErrorState.displayName = 'ErrorState';
