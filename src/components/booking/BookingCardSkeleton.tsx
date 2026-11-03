import { colors, palette } from '../../design';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function BookingCardSkeleton() {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.header}>
        <View style={styles.badgePlaceholder} />
        <View style={styles.pricePlaceholder} />
      </View>

      <View style={styles.workerRow}>
        <View style={styles.avatarPlaceholder} />
        <View style={styles.textColumn}>
          <View style={styles.namePlaceholder} />
          <View style={styles.categoryPlaceholder} />
        </View>
      </View>

      <View style={styles.datePlaceholder} />
      
      <View style={styles.actionsPlaceholder}>
        <View style={styles.buttonPlaceholder} />
        <View style={styles.buttonPlaceholder} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgePlaceholder: {
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgHover,
  },
  pricePlaceholder: {
    width: 60,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.bgHover,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgHover,
    marginRight: 12,
  },
  textColumn: {
    justifyContent: 'center',
  },
  namePlaceholder: {
    width: 120,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.bgHover,
    marginBottom: 8,
  },
  categoryPlaceholder: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.bgHover,
  },
  datePlaceholder: {
    width: 140,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.bgHover,
    marginBottom: 12,
  },
  actionsPlaceholder: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'space-between',
  },
  buttonPlaceholder: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.bgHover,
    marginHorizontal: 6,
  },
});
