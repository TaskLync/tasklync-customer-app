import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';

import { radius } from '../../design/radius';
import { shadows } from '../../design/shadows';
import { layout } from '../../design/spacing';
import { springConfig } from '../../design/animations';

import { OnlineBadge } from '../ui/Badge/OnlineBadge';
import { WorkerNearby } from '../../types/worker.types';
import { WorkerAvatar } from './WorkerAvatar';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

interface WorkerCardProps {
  worker: WorkerNearby;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({ worker }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, springConfig.bouncy);
  };

  const handlePress = () => {
    router.push(`/worker/${worker.id}` as any);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: scale.value < 1 ? 0 : ((shadows.sm as any).shadowOpacity || 0.08),
      elevation: scale.value < 1 ? 0 : ((shadows.sm as any).elevation || 2),
    };
  });

  const getAvatarStatus = () => {
    switch (worker.availabilityStatus) {
      case 'AVAILABLE': return 'online';
      case 'BUSY': return 'busy';
      default: return 'offline';
    }
  };

  const getStatusColor = () => {
    switch (worker.availabilityStatus) {
      case 'AVAILABLE': return colors.online;
      case 'BUSY': return colors.busy;
      default: return colors.textMuted;
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <WorkerAvatar
        uri={worker.avatarUrl || (worker as any)?.avatar || (worker as any)?.avatar_url}
        name={worker.name}
        size={50}
        showOnlineBadge={true}
        isOnline={worker.availabilityStatus === 'AVAILABLE'}
        badgeSize={12}
      />

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{worker.name}</Text>
        <Text style={styles.category} numberOfLines={1}>
          {worker.categories[0]} {worker.categories.length > 1 ? `+ ${worker.categories.length - 1} more` : ''}
        </Text>
        <Text style={styles.stats}>
          ⭐ {worker.avgRating.toFixed(1)} · {worker.distanceLabel}
        </Text>
      </View>

      <View style={styles.rightAction}>
        {worker.startingPrice ? (
          <Text style={styles.price}>{worker.currency} {worker.startingPrice}/hr</Text>
        ) : (
          <Text style={styles.price}>Quote</Text>
        )}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {worker.availabilityStatus === 'AVAILABLE' ? 'Available' : 
           worker.availabilityStatus === 'BUSY' ? 'Busy' : 'Offline'}
        </Text>
        <View style={styles.chevron}>
          <ChevronRight size={14} color={colors.textMuted} />
        </View>
      </View>
    </AnimatedPressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
    height: 80,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: layout.cardGap,
    ...shadows.sm,
  },
  avatarContainer: {
    width: 56,
    height: 56,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  category: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  stats: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
  rightAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    marginBottom: 4,
  },
  chevron: {
    marginTop: 2,
  },
});
