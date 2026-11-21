import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClockIcon } from '../ui/Icon/icons';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface QuoteExpiryCountdownProps {
  validUntil: string;
  onExpire?: () => void;
}

/** Quiet validity line. Amber only in the last 4 hours; no pressure copy. */
export function QuoteExpiryCountdown({ validUntil, onExpire }: QuoteExpiryCountdownProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [label, setLabel] = useState('');
  const [soon, setSoon] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(validUntil).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        onExpire?.();
        return;
      }
      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      setSoon(hours < 4);
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setLabel(`${days}d ${hours % 24}h`);
      } else if (hours >= 1) {
        setLabel(`${hours}h ${minutes}m`);
      } else {
        setLabel(`${Math.max(minutes, 1)} min`);
      }
    };
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [validUntil, onExpire]);

  const tone = expired ? colors.textDanger : soon ? colors.warningMedium : colors.textSecondary;

  return (
    <View style={styles.row}>
      <ClockIcon size={14} color={tone} strokeWidth={2} />
      <Text style={[styles.text, { color: tone }]}>
        {expired ? 'This quote has expired' : `${soon ? 'Expires in' : 'Valid for'} ${label}`}
      </Text>
    </View>
  );
}

const createStyles = (_theme: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
  },
});
