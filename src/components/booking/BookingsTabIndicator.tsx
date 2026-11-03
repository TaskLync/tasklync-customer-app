import { colors, palette } from '../../design';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { TabType } from '../../hooks/useBookingsList';

interface BookingsTabIndicatorProps {
  activeTab: TabType;
  tabWidth: number;
}

export function BookingsTabIndicator({ activeTab, tabWidth }: BookingsTabIndicatorProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    let index = 0;
    if (activeTab === 'PAST') index = 1;
    if (activeTab === 'CANCELLED') index = 2;

    translateX.value = withSpring(index * tabWidth, {
      mass: 1,
      damping: 20,
      stiffness: 120, // calm, spring-gentle
      overshootClamping: true,
    });
  }, [activeTab, tabWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[
      styles.indicator, 
      { width: tabWidth }, 
      animatedStyle
    ]}>
      <View style={styles.indicatorLine} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    alignItems: 'center',
  },
  indicatorLine: {
    width: '60%',
    height: '100%',
    backgroundColor: colors.primaryDark,
    borderRadius: 2,
  },
});
