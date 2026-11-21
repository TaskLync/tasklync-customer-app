import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BellIcon, ChatIcon, SmartphoneIcon, TagIcon } from '../ui/Icon/icons';
import { ToggleRow } from './ToggleRow';
import { NotificationPreferences, NotificationPrefKey } from '../../types/settings.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface NotificationPreferenceGroupProps {
  preferences: NotificationPreferences;
  onToggle: (key: NotificationPrefKey) => void;
}

export const NotificationPreferenceGroup: React.FC<NotificationPreferenceGroupProps> = ({
  preferences,
  onToggle,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {/* 1. Booking Updates */}
      <ToggleRow
        label="Booking updates"
        icon={<BellIcon size={18} color={palette.gray500} />}
        value={preferences.push.booking_updates}
        onValueChange={() => onToggle('push.booking_updates')}
      />

      <View style={styles.divider} />

      {/* 2. Chat Messages */}
      <ToggleRow
        label="Chat messages"
        icon={<ChatIcon size={18} color={palette.gray500} />}
        value={preferences.push.chat_messages}
        onValueChange={() => onToggle('push.chat_messages')}
      />

      <View style={styles.divider} />

      {/* 3. Promotions & Offers */}
      <ToggleRow
        label="Promotions & offers"
        icon={<TagIcon size={18} color={palette.gray500} />}
        value={preferences.push.promotions}
        onValueChange={() => onToggle('push.promotions')}
      />

      <View style={styles.divider} />

      {/* 4. SMS Confirmations Only */}
      <ToggleRow
        label="SMS confirmations only"
        subtitle="Critical alerts & security codes"
        icon={<SmartphoneIcon size={18} color={palette.gray500} />}
        value={preferences.sms.booking_confirmations}
        onValueChange={() => onToggle('sms.booking_confirmations')}
      />
    </View>
  );
};

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  container: {},
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.gray200,
    marginLeft: 48,
  },
});
