import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { UserCheck, X } from 'lucide-react-native';
import { springConfig } from '../../design/animations';
import { colors, palette } from '../../design';

interface TechnicianReassignedBannerProps {
  newTechnicianName: string;
  reason?: string | null | undefined;
  onDismiss?: () => void;
}

export const TechnicianReassignedBanner: React.FC<TechnicianReassignedBannerProps> = ({
  newTechnicianName,
  reason,
  onDismiss,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide down smoothly
    translateY.value = withSpring(0, springConfig.bouncy);
    opacity.value = withTiming(1, { duration: 250 });
  }, []);

  const handleDismiss = () => {
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 180 }, () => {
      if (onDismiss) onDismiss();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.iconCircle}>
        <UserCheck size={18} color={colors.warningMedium} strokeWidth={2.4} />
      </View>

      <View style={styles.textGroup}>
        <Text style={styles.title}>Technician Reassigned by Agency</Text>
        <Text style={styles.body}>
          Your service has been reassigned to <Text style={styles.boldName}>{newTechnicianName}</Text>
          {reason ? ` (${reason})` : ''}.
        </Text>
      </View>

      {onDismiss && (
        <Pressable onPress={handleDismiss} hitSlop={10} style={styles.closeButton}>
          <X size={16} color={colors.textWarning} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 0,
    marginBottom: 12,
    gap: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12.5,
    color: colors.textWarning,
  },
  body: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11.5,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 16,
  },
  boldName: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: colors.textWarning,
  },
  closeButton: {
    padding: 4,
  },
});
