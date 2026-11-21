import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  type AppIconComponent,
  BellIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarRemoveIcon,
  ChatIcon,
  CheckCircleIcon,
  CouponIcon,
  DocumentCheckIcon,
  DocumentIcon,
  DocumentRemoveIcon,
  LocationIcon,
  NavigationIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  StarIcon,
  TagIcon,
  TaskDoneIcon,
  TaskIcon,
  TaskRemoveIcon,
  UserCheckIcon,
  UserRemoveIcon,
  WalletIcon,
  WrenchIcon,
} from '../ui/Icon/icons';
import { useAppTheme } from '../../theme/useAppTheme';

export interface NotificationIconProps {
  category?: string | null;
  templateKey?: string | null;
  size?: number;
  containerSize?: number;
  style?: StyleProp<ViewStyle>;
}

type Tone = 'neutral' | 'positive' | 'negative';

/**
 * Template keys sent by notification-service, mapped to one meaningful icon each.
 * Icons are neutral grey; colour is used only where it helps recognition at a glance
 * (green for a finished job, red for cancellations / no-shows / disputes).
 */
const BY_TEMPLATE: Record<string, { icon: AppIconComponent; tone: Tone }> = {
  booking_request_received: { icon: CalendarClockIcon, tone: 'neutral' },
  booking_accepted: { icon: CalendarCheckIcon, tone: 'neutral' },
  booking_rejected: { icon: CalendarRemoveIcon, tone: 'negative' },
  booking_cancelled_by_customer: { icon: CalendarRemoveIcon, tone: 'negative' },
  booking_cancelled_by_worker: { icon: CalendarRemoveIcon, tone: 'negative' },
  booking_cancelled_by_system: { icon: CalendarRemoveIcon, tone: 'negative' },
  booking_cancelled_by_admin: { icon: CalendarRemoveIcon, tone: 'negative' },
  booking_worker_arrived: { icon: LocationIcon, tone: 'neutral' },
  booking_started: { icon: WrenchIcon, tone: 'neutral' },
  booking_completion_requested: { icon: TaskDoneIcon, tone: 'neutral' },
  booking_completed: { icon: CheckCircleIcon, tone: 'positive' },
  booking_assignee_updated: { icon: UserCheckIcon, tone: 'neutral' },
  booking_reassigned: { icon: UserCheckIcon, tone: 'neutral' },
  booking_customer_no_show: { icon: UserRemoveIcon, tone: 'negative' },
  booking_worker_no_show: { icon: UserRemoveIcon, tone: 'negative' },
  custom_request_received: { icon: TaskIcon, tone: 'neutral' },
  custom_request_declined: { icon: TaskRemoveIcon, tone: 'negative' },
  quote_ready: { icon: DocumentIcon, tone: 'neutral' },
  quote_accepted: { icon: DocumentCheckIcon, tone: 'neutral' },
  quote_rejected: { icon: DocumentRemoveIcon, tone: 'negative' },
  dispute_opened_against_you: { icon: ShieldAlertIcon, tone: 'negative' },
  dispute_resolved: { icon: ShieldCheckIcon, tone: 'neutral' },
  new_chat_message: { icon: ChatIcon, tone: 'neutral' },
  coupon_returned: { icon: CouponIcon, tone: 'neutral' },
};

/** Fallback for template keys the app does not know yet: match by keyword, then by category. */
function resolve(templateKey: string, category: string): { icon: AppIconComponent; tone: Tone } {
  const exact = BY_TEMPLATE[templateKey];
  if (exact) return exact;
  const t = templateKey;
  const c = category;
  if (t.includes('cancel') || t.includes('reject') || t.includes('no_show')) return { icon: CalendarRemoveIcon, tone: 'negative' };
  if (t.includes('chat') || t.includes('message') || c.includes('chat') || c.includes('message')) return { icon: ChatIcon, tone: 'neutral' };
  if (t.includes('quote')) return { icon: DocumentIcon, tone: 'neutral' };
  if (t.includes('custom_request')) return { icon: TaskIcon, tone: 'neutral' };
  if (t.includes('en_route') || t.includes('track')) return { icon: NavigationIcon, tone: 'neutral' };
  if (t.includes('arrived')) return { icon: LocationIcon, tone: 'neutral' };
  if (t.includes('complete')) return { icon: CheckCircleIcon, tone: 'positive' };
  if (t.includes('dispute') || t.includes('security')) return { icon: ShieldAlertIcon, tone: 'negative' };
  if (t.includes('payment') || t.includes('payout') || c.includes('payment')) return { icon: WalletIcon, tone: 'neutral' };
  if (t.includes('review') || c.includes('review')) return { icon: StarIcon, tone: 'neutral' };
  if (t.includes('coupon')) return { icon: CouponIcon, tone: 'neutral' };
  if (t.includes('promo') || t.includes('category_') || c.includes('marketing') || c.includes('promo')) return { icon: TagIcon, tone: 'neutral' };
  if (t.startsWith('booking_') || c.includes('booking')) return { icon: CalendarCheckIcon, tone: 'neutral' };
  return { icon: BellIcon, tone: 'neutral' };
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  category = '',
  templateKey = '',
  size = 18,
  containerSize = 40,
  style,
}) => {
  const { colors } = useAppTheme();
  const { icon: Icon, tone } = resolve((templateKey || '').toLowerCase(), (category || '').toLowerCase());
  const color = tone === 'positive' ? colors.primaryDark : tone === 'negative' ? colors.textDanger : colors.textSecondary;

  return (
    <View
      style={[
        styles.container,
        { width: containerSize, height: containerSize, borderRadius: containerSize / 2, backgroundColor: colors.bgHover },
        style,
      ]}
    >
      <Icon size={size} color={color} strokeWidth={1.9} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
