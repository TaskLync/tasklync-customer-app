import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SlotInfo } from '../../../hooks/useWorkerSlots';
import { TimeSlotChip } from './TimeSlotChip';
import { TimeSlotSkeleton } from './TimeSlotSkeleton';
import { SkeletonGroup } from '../../ui/Skeleton/Skeleton';
import { fontFamily, radius } from '../../../design';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface TimeSlotGridProps {
  slots: SlotInfo[];
  isLoading: boolean;
  selectedTimeSlot: string | null;
  onSelectSlot: (timeStr: string) => void;
  isError?: boolean;
  onRetry?: () => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  isLoading,
  selectedTimeSlot,
  onSelectSlot,
  isError = false,
  onRetry,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Available Time Slots</Text>
        {!isLoading && !isError && slots.length > 0 && (
          <Text style={styles.slotCountText}>
            {slots.filter((s) => s.available).length} available
          </Text>
        )}
      </View>

      <View style={styles.grid}>
        {isLoading ? (
          <SkeletonGroup style={[styles.grid, styles.skeletonGrid]} accessibilityLabel="Loading time slots">
            {Array.from({ length: 6 }).map((_, idx) => (
              <TimeSlotSkeleton key={`slot-skel-${idx}`} />
            ))}
          </SkeletonGroup>
        ) : isError ? (
          <View style={styles.emptySlotBox}>
            <Text style={styles.emptySlotText}>Couldn't load available slots</Text>
            <Text style={styles.emptySlotSub}>
              Please check your internet connection and try again.
            </Text>
            {onRetry && (
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
                onPress={onRetry}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Retry loading slots"
              >
                <Text 
                  style={styles.retryBtnText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Retry
                </Text>
              </Pressable>
            )}
          </View>
        ) : slots.length > 0 ? (
          slots.map((slot) => (
            <TimeSlotChip
              key={slot.id}
              slot={slot}
              isSelected={selectedTimeSlot === slot.timeStr}
              onSelect={onSelectSlot}
            />
          ))
        ) : (
          <View style={styles.emptySlotBox}>
            <Text style={styles.emptySlotText}>No available slots on this date</Text>
            <Text style={styles.emptySlotSub}>
              Please select another date on the calendar or turn on Urgent Booking below.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: palette.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  slotCountText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonGrid: {
    width: '100%',
  },
  emptySlotBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    marginVertical: 4,
  },
  emptySlotText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySlotSub: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  retryBtnPressed: {
    opacity: 0.8,
  },
  retryBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: palette.pureWhite,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    alignSelf: 'center',
  },
});
