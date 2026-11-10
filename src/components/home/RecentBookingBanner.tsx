import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Button } from '../ui/Button';
import { OnlineBadge } from '../ui/Badge/OnlineBadge';
import { useActiveBooking } from '../../hooks/useActiveBooking';
import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { springConfig } from '../../design/animations';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export const RecentBookingBanner = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { data: activeBooking } = useActiveBooking();
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (activeBooking) {
      translateY.value = withSpring(0, springConfig.bouncy);
      opacity.value = withSpring(1, springConfig.bouncy);
    } else {
      translateY.value = withSpring(-20, springConfig.stiff);
      opacity.value = withSpring(0, springConfig.stiff);
    }
  }, [activeBooking]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!activeBooking) return null;

  const getStatusConfig = () => {
    switch (activeBooking.status) {
      case 'PENDING':
        return {
          dotStatus: 'busy' as const,
          dotColor: colors.busy,
          text: 'Waiting for worker',
          sub: `${activeBooking.workerName} · Expires soon`,
          buttons: (
            <Button 
              label="Cancel" 
              onPress={() => router.push(`/booking/${activeBooking.id}` as any)} 
              size="sm" 
              variant="secondary" 
              style={styles.btn} 
              fullWidth={false}
              numberOfLines={1}
            />
          ),
        };
      case 'ACCEPTED':
        return {
          dotStatus: 'offline' as const,
          dotColor: '#3B82F6',
          text: 'Booking Confirmed',
          sub: `${activeBooking.workerName} · ${activeBooking.scheduledTime || 'Scheduled'}`,
          buttons: (
            <>
              <Button label="Track" onPress={() => router.push(`/booking/${activeBooking.id}/track` as any)} size="sm" variant="primary" style={styles.btn} fullWidth={false} numberOfLines={1} />
              <Button label="Chat" onPress={() => router.push(`/booking/${activeBooking.id}/chat` as any)} size="sm" variant="secondary" style={styles.btn} fullWidth={false} numberOfLines={1} />
            </>
          ),
        };
      case 'IN_PROGRESS':
        return {
          dotStatus: 'online' as const,
          dotColor: colors.online,
          text: 'In Progress',
          sub: `${activeBooking.workerName} · Started recently`,
          buttons: (
            <>
              <Button label="Track" onPress={() => router.push(`/booking/${activeBooking.id}/track` as any)} size="sm" variant="primary" style={styles.btn} fullWidth={false} numberOfLines={1} />
              <Button label="Chat" onPress={() => router.push(`/booking/${activeBooking.id}/chat` as any)} size="sm" variant="secondary" style={styles.btn} fullWidth={false} numberOfLines={1} />
            </>
          ),
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.leftContent}>
        <View style={styles.statusRow}>
          <OnlineBadge status={config.dotStatus} size={8} />
          <Text 
            style={[styles.statusText, { color: config.dotColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {config.text}
          </Text>
        </View>
        <Text 
          style={styles.subText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {config.sub}
        </Text>
      </View>
      <View style={styles.rightContent}>
        {config.buttons}
      </View>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    marginVertical: 12,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.bgSuccess,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.xs,
  },
  leftContent: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    flexShrink: 1,
  },
  subText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  rightContent: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  btn: {
    minWidth: 80,
    paddingHorizontal: 14,
  },
});
