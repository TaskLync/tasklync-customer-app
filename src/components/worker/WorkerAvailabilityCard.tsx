import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { fontFamily } from '../../design/typography';
import { colors, palette } from '../../design/colors';
import { WorkerAvailabilityStatus } from '../../types/worker.types';

interface WorkerAvailabilityCardProps {
  status: WorkerAvailabilityStatus;
  availableUntil?: string | null;
  nextAvailable?: string | null;
  /** Optional: shown as "Replies in ~N min" only when > 0. */
  avgResponseMins?: number;
  style?: ViewStyle;
}

/** Subtle inline availability indicator: status dot + label, optional detail. No card surface. */
export const WorkerAvailabilityCard: React.FC<WorkerAvailabilityCardProps> = ({
  status,
  nextAvailable = null,
  avgResponseMins = 0,
  style,
}) => {
  const isAvailable = status === 'AVAILABLE';
  const isBusy = status === 'BUSY';

  const dotColor = isAvailable ? colors.primary : isBusy ? palette.amber500 : colors.textMuted;
  const haloColor = isAvailable ? colors.primaryBorderSubtle : isBusy ? palette.amber100 : colors.bgHover;
  const titleColor = isAvailable ? colors.textGreen : isBusy ? palette.amber700 : colors.textSecondary;
  const title = isAvailable ? 'Available now' : isBusy ? 'Currently on a job' : 'Offline';
  const detail = isAvailable
    ? avgResponseMins > 0
      ? `Replies in ~${avgResponseMins} min`
      : null
    : !isBusy && nextAvailable
    ? `Available ${nextAvailable}`
    : null;

  return (
    <View style={[styles.container, style]} accessibilityRole="text">
      <View style={[styles.halo, { backgroundColor: haloColor }]}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {detail ? <Text style={styles.detail}>{`  ·  ${detail}`}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  title: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13.5,
  },
  detail: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
