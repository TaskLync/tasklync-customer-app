import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import {
  Bell,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  Star,
  Sparkles,
  MapPin,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { colors, palette } from '../../design';

export interface NotificationIconProps {
  category?: string | null;
  templateKey?: string | null;
  size?: number;
  containerSize?: number;
  style?: StyleProp<ViewStyle>;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  category = '',
  templateKey = '',
  size = 18,
  containerSize = 42,
  style,
}) => {
  const cat = (category || '').toLowerCase();
  const template = (templateKey || '').toLowerCase();

  // 1. Chat & Instant Messaging
  if (cat.includes('chat') || cat.includes('message') || template.includes('chat') || template.includes('message')) {
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: colors.infoLight,
            borderColor: colors.borderInfoLight,
          },
          style,
        ]}
      >
        <MessageSquare size={size} color={colors.textInfo} strokeWidth={2.2} />
      </View>
    );
  }

  // 2. Booking Events
  if (cat.includes('booking') || template.startsWith('booking_')) {
    if (template.includes('cancel') || template.includes('reject')) {
      return (
        <View
          style={[
            styles.container,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              backgroundColor: colors.dangerLight,
              borderColor: colors.borderErrorLight,
            },
            style,
          ]}
        >
          <AlertCircle size={size} color={colors.dangerMedium} strokeWidth={2.2} />
        </View>
      );
    }

    if (template.includes('complete')) {
      return (
        <View
          style={[
            styles.container,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              backgroundColor: colors.primaryTint,
              borderColor: colors.primaryBorderSubtle,
            },
            style,
          ]}
        >
          <CheckCircle2 size={size} color={colors.primaryDark} strokeWidth={2.2} />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: colors.primaryTint,
            borderColor: colors.primaryBorderSubtle,
          },
          style,
        ]}
      >
        <CalendarCheck size={size} color={colors.primaryDark} strokeWidth={2.2} />
      </View>
    );
  }

  // 3. Payments & Escrow
  if (cat.includes('payment') || template.startsWith('payment_') || template.includes('payout')) {
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: colors.warningLight,
            borderColor: colors.warningBorder,
          },
          style,
        ]}
      >
        <CreditCard size={size} color={colors.warningMedium} strokeWidth={2.2} />
      </View>
    );
  }

  // 4. Ratings & Reviews
  if (cat.includes('review') || template.includes('review')) {
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: palette.amber100,
            borderColor: palette.amber200,
          },
          style,
        ]}
      >
        <Star size={size} color={colors.warning} strokeWidth={2.2} />
      </View>
    );
  }

  // 5. Worker Arrival & Tracking
  if (
    cat.includes('worker') ||
    template.includes('arrived') ||
    template.includes('en_route') ||
    template.includes('track')
  ) {
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: colors.primaryTint,
            borderColor: colors.primaryBorder,
          },
          style,
        ]}
      >
        <MapPin size={size} color={colors.primaryDark} strokeWidth={2.2} />
      </View>
    );
  }

  // 6. Security, Disputes & Platform Alerts
  if (cat.includes('platform') || template.includes('dispute') || template.includes('security')) {
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: colors.dangerLight,
            borderColor: colors.borderErrorLight,
          },
          style,
        ]}
      >
        <ShieldAlert size={size} color={colors.dangerMedium} strokeWidth={2.2} />
      </View>
    );
  }

  // 7. Marketing & Promos
  if (cat.includes('marketing') || cat.includes('promo') || template.includes('promo') || template.includes('greeting')) {
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: palette.purple50,
            borderColor: palette.purple100,
          },
          style,
        ]}
      >
        <Sparkles size={size} color={palette.purple600} strokeWidth={2.2} />
      </View>
    );
  }

  // 8. Default System Bell
  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: colors.bgHover,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Bell size={size} color={colors.textSecondary} strokeWidth={2.2} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
