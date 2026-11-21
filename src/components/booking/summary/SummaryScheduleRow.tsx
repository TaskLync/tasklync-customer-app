import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SummarySectionCard } from './SummarySectionCard';
import { fontFamily } from '../../../design';
import { formatPKTDate } from '../../../utils/timezone';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface SummaryScheduleRowProps {
  selectedDate: string | null;
  selectedTimeSlot: string | null;
}

export const SummaryScheduleRow: React.FC<SummaryScheduleRowProps> = ({
  selectedDate,
  selectedTimeSlot,
}) => {
  const styles = useThemedStyles(createStyles);
  // "2026-08-15" -> "Saturday, Aug 15, 2026"
  const formattedDate = React.useMemo(() => {
    if (!selectedDate) return 'Not selected';
    return formatPKTDate(`${selectedDate}T12:00:00.000Z`, { weekday: 'long' });
  }, [selectedDate]);

  return (
    <SummarySectionCard title="Date & time">
      <Text style={styles.dateValue}>{formattedDate}</Text>
      {selectedTimeSlot ? <Text style={styles.timeValue}>{selectedTimeSlot}</Text> : null}
    </SummarySectionCard>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  dateValue: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  timeValue: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
