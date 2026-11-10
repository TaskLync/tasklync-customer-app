import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OnlineBadge } from '../ui/Badge/OnlineBadge';
import { WorkerAvailabilityStatus } from '../../types/worker.types';
import { useAppTheme } from '../../theme/useAppTheme';

interface WorkerAvailabilityBadgeProps {
  status: WorkerAvailabilityStatus;
  availableUntil?: string | null;
  size?: 'sm' | 'md';
}

export const WorkerAvailabilityBadge: React.FC<WorkerAvailabilityBadgeProps> = ({
  status,
  availableUntil,
  size = 'sm',
}) => {
  const { colors } = useAppTheme();
  const getBadgeConfig = () => {
    switch (status) {
      case 'AVAILABLE':
        return {
          dotStatus: 'online' as const,
          text: `Available now${availableUntil ? ` · Until ${availableUntil}` : ''}`,
          color: colors.online,
        };
      case 'BUSY':
        return {
          dotStatus: 'busy' as const,
          text: 'On a job',
          color: colors.busy,
        };
      case 'PAUSED':
        return {
          dotStatus: 'offline' as const,
          text: 'Paused',
          color: colors.textMuted,
        };
      case 'OFFLINE':
        return {
          dotStatus: 'offline' as const,
          text: 'Offline',
          color: colors.textMuted,
        };
      case 'INACTIVE':
        return {
          dotStatus: null,
          text: 'Inactive',
          color: colors.textMuted,
        };
      case 'UNAVAILABLE':
        return {
          dotStatus: null,
          text: 'Unavailable today',
          color: colors.textMuted,
        };
      default:
        return {
          dotStatus: null,
          text: '',
          color: colors.textMuted,
        };
    }
  };

  const config = getBadgeConfig();
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <View style={styles.container}>
      {config.dotStatus && (
        <OnlineBadge status={config.dotStatus} size={6} style={styles.dot} />
      )}
      <Text
        style={[
          styles.text,
          { color: config.color, fontSize },
        ]}
        numberOfLines={1}
      >
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    marginTop: 1, // Visual alignment
  },
  text: {
    fontFamily: 'PlusJakartaSans-Medium',
  },
});
