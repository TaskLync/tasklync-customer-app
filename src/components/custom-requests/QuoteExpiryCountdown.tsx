import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, AlertCircle } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface QuoteExpiryCountdownProps {
  validUntil: string;
  onExpire?: () => void;
}

export function QuoteExpiryCountdown({ validUntil, onExpire }: QuoteExpiryCountdownProps) {
  const { colors } = useAppTheme();
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(validUntil).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeftStr('Quote Expired');
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(hours < 4);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        setTimeLeftStr(`${days}d ${remHours}h remaining`);
      } else {
        setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s remaining`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [validUntil, onExpire]);

  if (isExpired) {
    return (
      <View style={[styles.container, styles.containerExpired]}>
        <AlertCircle size={15} color={palette.red500} />
        <Text style={[styles.text, styles.textExpired]}>This quote has expired</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isUrgent && styles.containerUrgent]}>
      <Clock size={15} color={isUrgent ? colors.textDanger : colors.textInfo} />
      <Text style={[styles.text, isUrgent && styles.textUrgent]}>
        {isUrgent ? 'Hurry! ' : 'Valid for '}
        {timeLeftStr}
      </Text>
    </View>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderInfoLight,
    marginBottom: 14,
  },
  containerUrgent: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.borderErrorLight,
  },
  containerExpired: {
    backgroundColor: colors.bgHover,
    borderColor: colors.border,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: palette.blue700,
    marginLeft: 6,
  },
  textUrgent: {
    color: colors.dangerMedium,
    fontFamily: 'Inter-SemiBold',
  },
  textExpired: {
    color: palette.gray500,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});
