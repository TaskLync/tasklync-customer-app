import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, StatusBar } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { ChevronLeftIcon } from '../ui/Icon/icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '../../design/shadows';
import { typography } from '../../design/typography';
import { WorkerPublicProfile } from '../../types/worker.types';
import { WorkerAvatar } from './WorkerAvatar';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface WorkerCompactHeaderProps {
  worker?: WorkerPublicProfile;
  scrollY: SharedValue<number>;
  onBack: () => void;
}

export const WorkerCompactHeader: React.FC<WorkerCompactHeaderProps> = ({
  worker,
  scrollY,
  onBack,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [interactable, setInteractable] = useState(false);

  // We show the header when scroll is past 120px
  useAnimatedReaction(
    () => scrollY.value,
    (value) => {
      const isVisible = value > 120;
      if (isVisible !== interactable) {
        runOnJS(setInteractable)(isVisible);
      }
    },
    [interactable]
  );

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [100, 150], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [100, 150], [-8, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const handleBackPress = () => {
    onBack();
  };

  const insets = useSafeAreaInsets();
  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0
  );

  return (
    <Animated.View
      pointerEvents={interactable ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          height: 56 + safeTop,
          paddingTop: safeTop,
        },
        containerAnimatedStyle,
      ]}
    >
      <View style={styles.innerContainer}>
        {/* Back Button */}
        <Pressable
          onPress={handleBackPress}
          style={styles.backButton}
          hitSlop={12}
        >
          <ChevronLeftIcon size={24} color={colors.textPrimary} />
        </Pressable>

        {/* Center: Profile Mini Info */}
        <View style={styles.centerGroup}>
          <WorkerAvatar
            uri={worker?.avatarUrl}
            name={worker?.name}
            size={32}
          />
          <Text style={styles.nameText} numberOfLines={1}>
            {worker?.name || 'Worker'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    ...shadows.sm,
    zIndex: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  centerGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgInput,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameText: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
});
