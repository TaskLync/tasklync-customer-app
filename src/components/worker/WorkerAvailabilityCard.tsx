import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { fontFamily } from '../../design/typography';
import { colors, palette } from '../../design/colors';
import { WorkerAvailabilityStatus } from '../../types/worker.types';

interface WorkerAvailabilityCardProps {
  status: WorkerAvailabilityStatus;
  availableUntil?: string | null;
  nextAvailable?: string | null;
  avgResponseMins: number;
  style?: ViewStyle;
}

/** Tinted availability strip: soft semantic surface, pulsing dot, and response time. */
export const WorkerAvailabilityCard: React.FC<WorkerAvailabilityCardProps> = ({
  status,
  nextAvailable = null,
  avgResponseMins = 30,
  style,
}) => {
  const isAvailable = status === 'AVAILABLE';
  const isBusy = status === 'BUSY';

  const bg = isAvailable ? colors.primaryTint : isBusy ? palette.amber50 : colors.bgSection;
  const dotColor = isAvailable ? colors.primary : isBusy ? palette.amber500 : colors.textMuted;
  const titleColor = isAvailable ? colors.textGreenDark : isBusy ? palette.amber800 : colors.textSecondary;
  const title = isAvailable ? 'Available now' : isBusy ? 'Currently on a job' : 'Offline';
  const detail = isAvailable
    ? avgResponseMins > 0
      ? `Replies within ${avgResponseMins} min`
      : null
    : !isBusy && nextAvailable
    ? `Available ${nextAvailable}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {detail ? <Text style={styles.detail}>{`  \u00B7  ${detail}`}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    width: '100%',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
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