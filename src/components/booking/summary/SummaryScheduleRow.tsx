import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { SummarySectionCard } from './SummarySectionCard';
import { UrgentPriceBadge } from '../schedule/UrgentPriceBadge';
import { fontFamily } from '../../../design';
import { formatPKTDate } from '../../../utils/timezone';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SummaryScheduleRowProps {
  selectedDate: string | null;
  selectedTimeSlot: string | null;
  isUrgent: boolean;
}

export const SummaryScheduleRow: React.FC<SummaryScheduleRowProps> = ({
  selectedDate,
  selectedTimeSlot,
  isUrgent,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  // Format date helper: "2026-08-15" -> "Saturday, Aug 15, 2026"
  const formattedDate = React.useMemo(() => {
    if (!selectedDate) return 'Not selected';
    return formatPKTDate(`${selectedDate}T12:00:00.000Z`, { weekday: 'long' });
  }, [selectedDate]);

  return (
    <SummarySectionCard
      icon={<Calendar size={16} color={colors.primaryDark} strokeWidth={2.2} />}
      title="Schedule & Arrival"
    >
      <View style={styles.contentRow}>
        <View style={styles.infoGroup}>
          <Text style={styles.dateValue}>{formattedDate}</Text>
          <View style={styles.timeRow}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={styles.timeValue}>{selectedTimeSlot || '09:00 AM'}</Text>
          </View>
        </View>

        {isUrgent && <UrgentPriceBadge visible={true} badgeText="Urgent (+30%)" />}
      </View>
    </SummarySectionCard>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoGroup: {
    flex: 1,
  },
  dateValue: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timeValue: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
